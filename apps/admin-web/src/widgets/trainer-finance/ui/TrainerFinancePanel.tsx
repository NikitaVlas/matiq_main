'use client';

import type { AdminApiPath } from '@matiq/contracts';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi, adminIdentityApi } from '../../../shared/api/client';

type Trainer = { id: string; email: string; trainerProfile?: { displayName: string } };
type Agreement = {
  id: string;
  trainerId: string;
  version: number;
  status: string;
  validFrom: string;
  validUntil?: string;
  participatesInPool: boolean;
  fixedFeeCents: number;
};
type Report = {
  id: string;
  status: string;
  trainer: { trainerProfile?: { displayName: string } };
  payableCents: number;
  carriedOutCents: number;
};
type Period = { id: string; month: string; distributablePoolCents: number; reports: Report[] };
type Finance = { agreements: Agreement[]; periods: Period[] };

export function TrainerFinancePanel({ trainers }: { trainers: Trainer[] }) {
  const [data, setData] = useState<Finance>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [reauthenticatedUntil, setReauthenticatedUntil] = useState(0);

  async function load() {
    const response = await adminApi('/admin/trainer-finance' as AdminApiPath);
    if (!response.ok) throw new Error();
    setData((await response.json()) as Finance);
  }

  useEffect(() => {
    void load().catch(() => setError('Finanzdaten konnten nicht geladen werden.'));
  }, []);

  async function submit(path: string, body?: object) {
    if (reauthenticatedUntil <= Date.now()) {
      setError('Bitte bestätige zuerst dein Admin-Passwort.');
      return false;
    }
    setBusy(true);
    setError('');
    const response = await adminApi(path as AdminApiPath, {
      method: 'POST',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!response.ok) {
      setError('Aktion fehlgeschlagen. Bitte Eingaben und Status prüfen.');
      return false;
    }
    setMessage('Finanzdaten wurden aktualisiert.');
    await load();
    return true;
  }

  async function reauthenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await adminIdentityApi('/auth/admin-reauthenticate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    setPassword('');
    if (!response.ok) {
      setError('Passwortbestätigung fehlgeschlagen.');
      return;
    }
    setReauthenticatedUntil(Date.now() + 14 * 60 * 1000);
    setError('');
    setMessage('Kritische Finanzaktionen sind für 15 Minuten freigegeben.');
  }

  async function createAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await submit('/admin/trainer-finance/agreements', {
      trainerId: values.get('trainerId'),
      validFrom: new Date(String(values.get('validFrom'))).toISOString(),
      validUntil: values.get('validUntil')
        ? new Date(String(values.get('validUntil'))).toISOString()
        : undefined,
      participatesInPool: values.get('participatesInPool') === 'on',
      fixedFeeCents: Math.round(Number(values.get('fixedFeeEuro')) * 100),
      specialTerms: values.get('specialTerms') || undefined,
    });
    if (success) form.reset();
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const cents = (name: string) => Math.round(Number(values.get(name)) * 100);
    const success = await submit('/admin/trainer-finance/periods', {
      month: values.get('month'),
      grossRevenueCents: cents('gross'),
      vatCents: cents('vat'),
      refundsCents: cents('refunds'),
      chargebacksCents: cents('chargebacks'),
      providerFeesCents: cents('fees'),
    });
    if (success) form.reset();
  }

  return (
    <section style={{ marginTop: 48 }} aria-labelledby="trainer-finance-title">
      <p>30 % vom Netto-Abonnementumsatz · Trial-Gewichtung 0 %</p>
      <h2 id="trainer-finance-title">Trainerverträge und Abrechnungen</h2>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <form onSubmit={reauthenticate} style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <label>
          Admin-Passwort bestätigen
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button disabled={busy}>Finanzaktionen freigeben</button>
      </form>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: 24,
        }}
      >
        <form onSubmit={createAgreement} style={{ display: 'grid', gap: 10 }}>
          <h3>Neue Vertragsversion</h3>
          <label>
            Trainer
            <select name="trainerId" required>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.trainerProfile?.displayName ?? trainer.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gültig ab
            <input name="validFrom" type="date" required />
          </label>
          <label>
            Gültig bis
            <input name="validUntil" type="date" />
          </label>
          <label>
            <input name="participatesInPool" type="checkbox" defaultChecked /> Teilnahme am
            30-%-Pool
          </label>
          <label>
            Fixbetrag pro Monat (EUR)
            <input
              name="fixedFeeEuro"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Sonderbedingungen
            <textarea name="specialTerms" maxLength={4000} />
          </label>
          <button disabled={busy || trainers.length === 0}>Entwurf anlegen</button>
        </form>
        <form onSubmit={createPeriod} style={{ display: 'grid', gap: 10 }}>
          <h3>Kalendermonat berechnen</h3>
          <label>
            Monat
            <input name="month" type="month" required />
          </label>
          {['gross', 'vat', 'refunds', 'chargebacks', 'fees'].map((name) => (
            <label key={name}>
              {
                (
                  {
                    gross: 'Zahlungen brutto',
                    vat: 'Umsatzsteuer',
                    refunds: 'Erstattungen',
                    chargebacks: 'Chargebacks',
                    fees: 'PSP-Gebühren',
                  } as Record<string, string>
                )[name]
              }{' '}
              (EUR)
              <input name={name} type="number" min="0" step="0.01" defaultValue="0" required />
            </label>
          ))}
          <button disabled={busy}>Abrechnung als Entwurf erstellen</button>
        </form>
      </div>
      {!data ? <p aria-busy="true">Finanzdaten werden geladen …</p> : null}
      {data?.agreements.length === 0 ? (
        <p>Noch keine Vertragsversion vorhanden.</p>
      ) : (
        data?.agreements.map((agreement) => (
          <article key={agreement.id}>
            <strong>Version {agreement.version}</strong> · {agreement.status} ·{' '}
            {money(agreement.fixedFeeCents)} · Pool {agreement.participatesInPool ? 'ja' : 'nein'}{' '}
            {agreement.status === 'DRAFT' ? (
              <button
                disabled={busy}
                onClick={() =>
                  void submit(`/admin/trainer-finance/agreements/${agreement.id}/activate`)
                }
              >
                Aktivieren
              </button>
            ) : null}
          </article>
        ))
      )}
      {data?.periods.map((period) => (
        <section key={period.id}>
          <h3>
            {period.month} · Pool {money(period.distributablePoolCents)}
          </h3>
          {period.reports.map((report) => (
            <article key={report.id}>
              <span>
                {report.trainer.trainerProfile?.displayName ?? 'Trainer'} · {report.status} ·
                zahlbar {money(report.payableCents)} · Vortrag {money(report.carriedOutCents)}
              </span>
              <ReportActions report={report} busy={busy} submit={submit} />
            </article>
          ))}
        </section>
      ))}
    </section>
  );
}

function ReportActions({
  report,
  busy,
  submit,
}: {
  report: Report;
  busy: boolean;
  submit(path: string, body: object): Promise<boolean>;
}) {
  if (report.status === 'DRAFT')
    return (
      <button
        disabled={busy}
        onClick={() =>
          void submit(`/admin/trainer-finance/reports/${report.id}/status`, { status: 'REVIEWED' })
        }
      >
        Geprüft
      </button>
    );
  if (report.status === 'REVIEWED')
    return (
      <button
        disabled={busy}
        onClick={() =>
          void submit(`/admin/trainer-finance/reports/${report.id}/status`, { status: 'APPROVED' })
        }
      >
        Freigeben
      </button>
    );
  if (report.status === 'APPROVED' && report.payableCents > 0)
    return (
      <button
        disabled={busy}
        onClick={() => {
          const reference = window.prompt('Externe Zahlungsreferenz');
          if (reference)
            void submit(`/admin/trainer-finance/reports/${report.id}/status`, {
              status: 'PAID',
              externalPaymentReference: reference,
            });
        }}
      >
        Als bezahlt markieren
      </button>
    );
  return null;
}

function money(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
