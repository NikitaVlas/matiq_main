'use client';

import { useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

type FinanceOverview = {
  totals: { paidMs: number; trialMs: number };
  agreement?: {
    version: number;
    validFrom: string;
    validUntil?: string;
    participatesInPool: boolean;
    fixedFeeCents: number;
    specialTerms?: string;
  };
  reports: {
    id: string;
    month: string;
    status: string;
    paidWatchMs: string;
    trialWatchMs: string;
    poolShareCents: number;
    fixedFeeCents: number;
    carriedInCents: number;
    payableCents: number;
    carriedOutCents: number;
    paidAt?: string;
  }[];
};

export function TrainerFinanceDashboard() {
  const [data, setData] = useState<FinanceOverview>();
  const [error, setError] = useState('');
  useEffect(() => {
    userApiResponse('/trainer-finance/overview')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setData((await response.json()) as FinanceOverview);
      })
      .catch(() => setError('Deine Trainerdaten konnten nicht geladen werden.'));
  }, []);
  if (error)
    return (
      <main className="dashboard-page">
        <p role="alert">{error}</p>
      </main>
    );
  if (!data)
    return (
      <main className="dashboard-page" aria-busy="true">
        Trainerdaten werden geladen …
      </main>
    );
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dein Bereich</p>
          <h1>TRAINER-DASHBOARD</h1>
        </div>
      </header>
      <div className="dashboard-layout">
        <section className="dashboard-feature">
          <p className="eyebrow">Bestätigte Wiedergabezeit</p>
          <h2>{duration(data.totals.paidMs)} bezahlt</h2>
          <p>{duration(data.totals.trialMs)} während Testphasen. Trial wird mit 0 % vergütet.</p>
        </section>
        <aside className="dashboard-panel">
          <p className="eyebrow">Aktueller Vertrag</p>
          {data.agreement ? (
            <>
              <strong>Version {data.agreement.version}</strong>
              <p>
                {data.agreement.participatesInPool
                  ? 'Teilnahme am 30-%-Pool'
                  : 'Keine Pool-Teilnahme'}{' '}
                · Fixbetrag {money(data.agreement.fixedFeeCents)}
              </p>
              {data.agreement.specialTerms ? <p>{data.agreement.specialTerms}</p> : null}
            </>
          ) : (
            <p>Noch kein aktiver Vertrag hinterlegt.</p>
          )}
        </aside>
      </div>
      <section className="dashboard-courses">
        <h2>Deine Abrechnungen</h2>
        {data.reports.length === 0 ? (
          <p>Noch keine Monatsabrechnung vorhanden.</p>
        ) : (
          data.reports.map((report) => (
            <article key={report.id}>
              <p className="eyebrow">
                {report.month} · {statusLabel(report.status)}
              </p>
              <h3>{money(report.payableCents)} zahlbar</h3>
              <p>
                Pool-Anteil {money(report.poolShareCents)} · Fixbetrag {money(report.fixedFeeCents)}{' '}
                · Vortrag {money(report.carriedInCents)} · Neuer Vortrag{' '}
                {money(report.carriedOutCents)}
              </p>
              <p>
                {duration(Number(report.paidWatchMs))} bezahlt ·{' '}
                {duration(Number(report.trialWatchMs))} Trial
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function money(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function duration(ms: number) {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours} Std. ${minutes} Min.`;
}
function statusLabel(status: string) {
  return (
    (
      {
        DRAFT: 'Entwurf',
        REVIEWED: 'Geprüft',
        APPROVED: 'Freigegeben',
        PAID: 'Bezahlt',
        VOID: 'Storniert',
      } as Record<string, string>
    )[status] ?? status
  );
}
