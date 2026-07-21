'use client';

import { useEffect, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<{
    status: string;
    endsAt?: string;
    hasAccess: boolean;
  }>();
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
            {subscription.status === 'TRIAL' && (
              <button onClick={() => action('activate')}>
                Monatliche Mitgliedschaft aktivieren
              </button>
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
