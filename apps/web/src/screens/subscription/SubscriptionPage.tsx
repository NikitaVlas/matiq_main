'use client';

import Link from 'next/link';
import type { UserApiPath } from '@matiq/contracts';
import { useEffect, useRef, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

const statusLabels: Record<string, string> = {
  NONE: 'Noch keine Mitgliedschaft',
  ACTIVE: 'Aktiv',
  CANCEL_AT_PERIOD_END: 'Kündigung vorgemerkt',
  CANCELED: 'Gekündigt',
  EXPIRED: 'Abgelaufen',
  PAST_DUE: 'Zahlung ausstehend',
  TRIAL: 'Testphase',
};

type Subscription = {
  status: string;
  endsAt?: string;
  graceEndsAt?: string;
  hasAccess: boolean;
};

class SubscriptionRequestError extends Error {}

async function requestJson<T>(path: UserApiPath, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await userApiResponse(path, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const code = body.code ?? body.message;
      if (response.status === 401)
        throw new SubscriptionRequestError('Bitte melde dich erneut an.');
      if (code === 'TRIAL_ASSESSMENT_REQUIRED')
        throw new SubscriptionRequestError('Bitte schließe zuerst dein Assessment ab.');
      if (code === 'TRIAL_ACCOUNT_NOT_ELIGIBLE')
        throw new SubscriptionRequestError(
          'Dein Konto ist nicht für die Testphase freigegeben. Bitte bestätige deine E-Mail-Adresse.',
        );
      throw new SubscriptionRequestError(
        'Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.',
      );
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function errorMessage(error: unknown) {
  if (error instanceof TypeError) return 'Verbindung fehlgeschlagen. Bitte versuche es erneut.';
  if (error instanceof DOMException && error.name === 'AbortError')
    return 'Die Anfrage dauert zu lange. Bitte prüfe den Status und versuche es erneut.';
  return error instanceof SubscriptionRequestError
    ? error.message
    : 'Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.';
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription>();
  const [trialPrerequisite, setTrialPrerequisite] = useState<'email' | 'assessment' | 'ready'>();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [immediateAccessConsent, setImmediateAccessConsent] = useState(false);
  const [withdrawalAcknowledgement, setWithdrawalAcknowledgement] = useState(false);
  const [cancellationConfirmationOpen, setCancellationConfirmationOpen] = useState(false);
  async function refresh() {
    const next = await requestJson<Subscription>('/subscription');
    if (typeof next.status !== 'string' || typeof next.hasAccess !== 'boolean')
      throw new SubscriptionRequestError('Der Mitgliedschaftsstatus konnte nicht geladen werden.');
    let prerequisite: 'email' | 'assessment' | 'ready' | undefined;
    if (next.status === 'NONE') {
      const account = await requestJson<{ emailVerified: boolean }>('/auth/me');
      if (!account.emailVerified) prerequisite = 'email';
      else {
        const result = await requestJson<{ completed: boolean }>('/assessment/answers');
        prerequisite = result.completed ? 'ready' : 'assessment';
      }
    }
    setTrialPrerequisite(prerequisite);
    setSubscription(next);
  }

  async function run(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void run(refresh);
  }, []);
  async function action(path: 'activate-trial' | 'cancel' | 'resume', body?: object) {
    await run(async () => {
      const result = await requestJson<{ canceled?: boolean; resumed?: boolean }>(
        `/subscription/${path}`,
        {
          method: 'POST',
          headers: body ? { 'content-type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      if (
        (path === 'cancel' && result.canceled !== true) ||
        (path === 'resume' && result.resumed !== true)
      )
        throw new SubscriptionRequestError(
          'Die Änderung wurde nicht bestätigt. Bitte lade den Status erneut.',
        );
      // A failed status refresh must not leave stale mutation controls active.
      setSubscription(undefined);
      await refresh();
      if (path === 'cancel') setCancellationConfirmationOpen(false);
    });
  }
  async function redirect(
    path:
      | '/subscription/checkout'
      | '/subscription/payment-update-portal'
      | '/subscription/billing-portal',
    body?: object,
  ) {
    await run(async () => {
      const result = await requestJson<{ url: string }>(path, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const url = new URL(result.url);
      if (url.protocol !== 'https:')
        throw new SubscriptionRequestError('Die Zahlungsseite ist derzeit nicht verfügbar.');
      window.location.assign(url.href);
    });
  }
  function checkout() {
    if (!immediateAccessConsent || !withdrawalAcknowledgement) return;
    return redirect('/subscription/checkout', {
      immediateAccessConsent,
      withdrawalAcknowledgement,
    });
  }
  function paymentUpdatePortal() {
    return redirect('/subscription/payment-update-portal');
  }
  function billingPortal() {
    return redirect('/subscription/billing-portal');
  }
  async function cancel() {
    await action('cancel', { confirmed: true });
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Mitgliedschaft</p>
        <h1>Dein Zugang zu MATIQ</h1>
        {error && <p role="alert">{error}</p>}
        {error && (
          <button disabled={busy} onClick={() => run(refresh)}>
            Status erneut laden
          </button>
        )}
        {busy && <p role="status">Anfrage wird verarbeitet …</p>}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <legend className="sr-only">Mitgliedschaft verwalten</legend>
          {subscription ? (
            <>
              <p>
                Status: <strong>{statusLabels[subscription.status] ?? subscription.status}</strong>
              </p>
              {subscription.endsAt && (
                <p>Gültig bis: {new Date(subscription.endsAt).toLocaleDateString('de-DE')}</p>
              )}
              {subscription.status === 'ACTIVE' && subscription.endsAt && (
                <p>
                  Nächste Abbuchung: 15,00 € am{' '}
                  {new Date(subscription.endsAt).toLocaleDateString('de-DE')}.
                </p>
              )}
              {subscription.status === 'CANCEL_AT_PERIOD_END' && subscription.endsAt && (
                <p>
                  Deine Kündigung ist vorgemerkt. Dein Zugang bleibt bis zum{' '}
                  {new Date(subscription.endsAt).toLocaleDateString('de-DE')} aktiv; es erfolgen
                  keine weiteren Abbuchungen.
                </p>
              )}
              {subscription.status === 'PAST_DUE' && subscription.graceEndsAt && (
                <>
                  <p>
                    Die letzte Zahlung war nicht erfolgreich. Dein Zugang bleibt bis zum{' '}
                    {new Date(subscription.graceEndsAt).toLocaleDateString('de-DE')} aktiv. Bitte
                    aktualisiere deine Zahlungsmethode in Stripe.
                  </p>
                  <button onClick={paymentUpdatePortal}>Zahlungsmethode aktualisieren</button>
                </>
              )}
              {subscription.status === 'CANCEL_AT_PERIOD_END' && (
                <button onClick={() => action('resume')}>Mitgliedschaft fortsetzen</button>
              )}
              {subscription.hasAccess &&
                ['ACTIVE', 'PAST_DUE', 'CANCEL_AT_PERIOD_END'].includes(subscription.status) && (
                  <button onClick={billingPortal}>Rechnungen und Zahlungsmethode verwalten</button>
                )}
              {subscription.status === 'NONE' && trialPrerequisite === 'ready' && (
                <button onClick={() => action('activate-trial')}>7 Tage Trial starten</button>
              )}
              {subscription.status === 'NONE' && trialPrerequisite === 'assessment' && (
                <p>
                  Schließe zuerst dein <Link href="/assessment">Assessment</Link> ab, um die
                  kostenlose Testphase zu starten.
                </p>
              )}
              {subscription.status === 'NONE' && trialPrerequisite === 'email' && (
                <p>
                  Bitte <Link href="/check-email">bestätige deine E-Mail-Adresse</Link>, bevor du
                  die Testphase startest.
                </p>
              )}
              {['TRIAL', 'PAST_DUE', 'EXPIRED', 'CANCELED'].includes(subscription.status) && (
                <section>
                  <h3>Monatliche Mitgliedschaft</h3>
                  <p>
                    15,00 € pro Monat, inklusive Umsatzsteuer. Automatische Verlängerung bis zur
                    Kündigung.
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={immediateAccessConsent}
                      onChange={(event) => setImmediateAccessConsent(event.target.checked)}
                    />
                    Ich verlange, dass MATIQ den digitalen Zugang sofort bereitstellt.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={withdrawalAcknowledgement}
                      onChange={(event) => setWithdrawalAcknowledgement(event.target.checked)}
                    />
                    Ich bestätige, dass dadurch mein Widerrufsrecht gemäß den vor dem Kauf
                    angezeigten Bedingungen erlöschen kann.
                  </label>
                  <button
                    disabled={!immediateAccessConsent || !withdrawalAcknowledgement}
                    onClick={checkout}
                  >
                    Für 15,00 € pro Monat bezahlen
                  </button>
                </section>
              )}
              {cancellationConfirmationOpen && (
                <section>
                  <p>
                    Möchtest du die automatische Verlängerung wirklich beenden? Dein Zugang bleibt
                    bis zum Ende des bereits bezahlten Zeitraums aktiv.
                  </p>
                  <button onClick={cancel}>Kündigung bestätigen</button>
                  <button onClick={() => setCancellationConfirmationOpen(false)}>Abbrechen</button>
                </section>
              )}
              {subscription.hasAccess &&
                subscription.status !== 'CANCEL_AT_PERIOD_END' &&
                !cancellationConfirmationOpen && (
                  <button onClick={() => setCancellationConfirmationOpen(true)}>
                    Mitgliedschaft kündigen
                  </button>
                )}
            </>
          ) : (
            !error && <p>Lade Status …</p>
          )}
        </fieldset>
      </section>
    </main>
  );
}
