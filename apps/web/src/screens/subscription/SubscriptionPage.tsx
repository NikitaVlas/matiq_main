'use client';

import { useEffect, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<{
    status: string;
    endsAt?: string;
    hasAccess: boolean;
  }>();
  const [immediateAccessConsent, setImmediateAccessConsent] = useState(false);
  const [withdrawalAcknowledgement, setWithdrawalAcknowledgement] = useState(false);
  async function refresh() {
    const response = await fetch(`${api}/subscription`, { credentials: 'include' });
    setSubscription(await response.json());
  }
  useEffect(() => {
    refresh();
  }, []);
  async function action(path: string) {
    await fetch(`${api}/subscription/${path}`, { method: 'POST', credentials: 'include' });
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
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Mitgliedschaft</p>
        <h2>Dein Zugang zu MATIQ</h2>
        {subscription ? (
          <>
            <p>
              Status: <strong>{subscription.status}</strong>
            </p>
            {subscription.endsAt && (
              <p>Gültig bis: {new Date(subscription.endsAt).toLocaleDateString('de-DE')}</p>
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
            {subscription.hasAccess && (
              <button onClick={() => action('cancel')}>Mitgliedschaft kündigen</button>
            )}
          </>
        ) : (
          <p>Lade Status …</p>
        )}
      </section>
    </main>
  );
}
