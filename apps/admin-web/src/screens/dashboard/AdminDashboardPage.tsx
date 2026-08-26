'use client';

import type { UserApiPath } from '@matiq/contracts';
import { FormEvent, useState } from 'react';
import { adminApi, adminIdentityApi } from '../../shared/api/client';
import { AdminStats } from '../../widgets/admin-stats/ui/AdminStats';
import {
  ViewingAnalytics,
  ViewingAnalyticsData,
} from '../../widgets/viewing-analytics/ui/ViewingAnalytics';

async function request(path: UserApiPath, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);

  try {
    return await adminIdentityApi(path, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function responseError(response: Response, fallback: string) {
  let code = '';
  try {
    const payload = (await response.json()) as { code?: string; message?: string };
    code = payload.code ?? payload.message ?? '';
  } catch {
    // The HTTP status below remains useful when the response body is not JSON.
  }

  return `${fallback} (HTTP ${response.status}${code ? `: ${code}` : ''})`;
}

export default function AdminHome() {
  const [mfaSetupSecret, setMfaSetupSecret] = useState('');
  const [stats, setStats] = useState<{
    users: number;
    trainers: number;
    videos: number;
    activeAssessmentQuestions: number;
  } | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<ViewingAnalyticsData | null>(null);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setAnalyticsLoaded(false);
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);
    const mfaCode = String(data.get('mfaCode') ?? '').trim();

    try {
      const login = await request('/auth/admin-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      if (!login.ok) {
        setError(await responseError(login, 'Anmeldung fehlgeschlagen'));
        return;
      }

      const loginResult = (await login.json()) as { mfaSetupRequired: boolean };
      if (loginResult.mfaSetupRequired) {
        const setup = await request('/auth/admin-mfa/setup', {
          method: 'POST',
          credentials: 'include',
        });
        if (!setup.ok) {
          setError(await responseError(setup, 'MFA-Einrichtung konnte nicht gestartet werden'));
          return;
        }
        setMfaSetupSecret((await setup.json()).secret);
        return;
      }

      let response: Response;
      let analyticsResponse: Response;
      try {
        [response, analyticsResponse] = await Promise.all([
          adminApi('/admin/stats'),
          adminApi('/admin/viewing-analytics'),
        ]);
      } catch {
        setError('Admin API ist nicht erreichbar. Bitte Port 4001 prüfen.');
        return;
      }
      if (!response.ok) {
        setError(await responseError(response, 'Administratorzugriff fehlgeschlagen'));
        return;
      }
      setStats(await response.json());
      if (!analyticsResponse.ok) {
        setAnalyticsLoaded(true);
        setError(await responseError(analyticsResponse, 'Wiedergabestatistik nicht verfügbar'));
        return;
      }
      setViewingAnalytics(await analyticsResponse.json());
      setAnalyticsLoaded(true);
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === 'AbortError'
          ? 'Die Anmeldung hat länger als 10 Sekunden gedauert. User API oder Datenbank prüfen.'
          : 'User API ist nicht erreichbar.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim();

    if (!/^\d{6}$/.test(code)) {
      setError('Bitte den sechsstelligen Code aus der Authenticator-App eingeben.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await request('/auth/admin-mfa/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        setError(await responseError(response, 'Der MFA-Code ist ungültig'));
      } else {
        setMfaSetupSecret('');
        setError('MFA ist aktiviert. Bitte erneut mit dem MFA-Code anmelden.');
      }
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === 'AbortError'
          ? 'Die MFA-Bestätigung hat länger als 10 Sekunden gedauert.'
          : 'User API ist nicht erreichbar.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 48 }}>
      <p style={{ color: '#c63d32', fontWeight: 800 }}>MATIQ ADMIN</p>
      <h1>Redaktion und Verwaltung</h1>
      <p>Redaktion für MATIQ-Inhalte und Assessment-Regeln.</p>
      <form onSubmit={load} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <label>
          E-Mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <label>
          MFA-Code
          <input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" />
        </label>
        <button disabled={isSubmitting}>
          {isSubmitting ? 'Bitte warten…' : 'Dashboard laden'}
        </button>
      </form>
      {mfaSetupSecret && (
        <form
          onSubmit={confirmMfa}
          style={{ display: 'grid', gap: 12, maxWidth: 420, marginTop: 24 }}
        >
          <p>
            Füge diesen geheimen Schlüssel in deine Authenticator-App ein:{' '}
            <code>{mfaSetupSecret}</code>
          </p>
          <label>
            Bestätigungscode
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              placeholder="123456"
              title="Sechsstelliger Code aus der Authenticator-App"
              required
            />
          </label>
          <button disabled={isSubmitting}>
            {isSubmitting ? 'Bitte warten…' : 'MFA aktivieren'}
          </button>
        </form>
      )}
      {error && <p style={{ color: '#a5221a' }}>{error}</p>}
      {stats && <AdminStats stats={stats} />}
      {stats && !analyticsLoaded && <p>Wiedergabestatistik wird geladen…</p>}
      {viewingAnalytics && <ViewingAnalytics data={viewingAnalytics} />}
    </main>
  );
}
