'use client';

import { useEffect, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktiv',
  CANCEL_AT_PERIOD_END: 'Kündigung vorgemerkt',
  CANCELED: 'Gekündigt',
  EXPIRED: 'Abgelaufen',
  PAST_DUE: 'Zahlung ausstehend',
  TRIAL: 'Testphase',
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<{
    status: string;
    endsAt?: string;
    graceEndsAt?: string;
    hasAccess: boolean;
  }>();
  const [immediateAccessConsent, setImmediateAccessConsent] = useState(false);
  const [withdrawalAcknowledgement, setWithdrawalAcknowledgement] = useState(false);
  const [cancellationConfirmationOpen, setCancellationConfirmationOpen] = useState(false);
  async function refresh() {
    const response = await fetch(`${api}/subscription`, { credentials: 'include' });
    setSubscription(await response.json());
  }
  useEffect(() => {
    refresh();
  }, []);
  async function action(path: string, body?: object) {
    await fetch(`${api}/subscription/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    await refresh();
  }
  async function checkout() {
    const response = await fetch(`${api}/subscription/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ immediateAccessConsent, withdrawalAcknowledgement }),
    });
    if (!response.ok) return;
    window.location.assign((await response.json()).url);
  }
  async function paymentUpdatePortal() {
    const response = await fetch(`${api}/subscription/payment-update-portal`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return;
    window.location.assign((await response.json()).url);
  }
  async function billingPortal() {
    const response = await fetch(`${api}/subscription/billing-portal`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return;
    window.location.assign((await response.json()).url);
  }
  async function cancel() {
    await action('cancel', { confirmed: true });
    setCancellationConfirmationOpen(false);
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Mitgliedschaft</p>
        <h2>Dein Zugang zu MATIQ</h2>
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
                {new Date(subscription.endsAt).toLocaleDateString('de-DE')} aktiv; es erfolgen keine
                weiteren Abbuchungen.
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
            {!subscription.hasAccess && (
              <button onClick={() => action('activate-trial')}>7 Tage Trial starten</button>
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
                  Ich bestätige, dass dadurch mein Widerrufsrecht gemäß den vor dem Kauf angezeigten
                  Bedingungen erlöschen kann.
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
                  Möchtest du die automatische Verlängerung wirklich beenden? Dein Zugang bleibt bis
                  zum Ende des bereits bezahlten Zeitraums aktiv.
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
          <p>Lade Status …</p>
        )}
      </section>
    </main>
  );
}
