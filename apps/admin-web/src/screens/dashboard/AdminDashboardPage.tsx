'use client';
import { t, useAdminLanguage } from '../../shared/i18n';
import type { UserApiPath } from '@matiq/contracts';
import { FormEvent, useState } from 'react';
import { adminApi, adminIdentityApi } from '../../shared/api/client';
import { AdminStats } from '../../widgets/admin-stats/ui/AdminStats';
import {
  ViewingAnalytics,
  ViewingAnalyticsData,
} from '../../widgets/viewing-analytics/ui/ViewingAnalytics';

type PrivacyOperations = {
  scheduled: number;
  dueSchedules: number;
  pendingDeletion: number;
  pendingOutbox: number;
  staleProcessing: number;
  failedInbox: number;
  privacyDeadLetters: number;
  renewalPending: number;
  renewalReviewRequired: number;
  oldestPendingSeconds: number;
};

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
  useAdminLanguage();
  const [mfaSetupSecret, setMfaSetupSecret] = useState('');
  const [stats, setStats] = useState<{
    users: number;
    trainers: number;
    videos: number;
    activeAssessmentQuestions: number;
  } | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<ViewingAnalyticsData | null>(null);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [privacyOperations, setPrivacyOperations] = useState<PrivacyOperations | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState('');
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
      let privacyResponse: Response;
      try {
        [response, analyticsResponse, privacyResponse] = await Promise.all([
          adminApi('/admin/stats'),
          adminApi('/admin/viewing-analytics'),
          adminApi('/admin/privacy-operations'),
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
      if (!privacyResponse.ok) {
        setError(await responseError(privacyResponse, 'GDPR-Betriebsstatus nicht verfügbar'));
        return;
      }
      setPrivacyOperations(await privacyResponse.json());
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

  async function retryPrivacyOperations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPrivacyMessage('');
    const data = new FormData(event.currentTarget);
    if (String(data.get('confirmation') ?? '').trim() !== 'RETRY') {
      setError('Bitte RETRY zur Bestätigung eingeben.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await adminApi('/admin/privacy-operations/retry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmation: 'RETRY' }),
      });
      if (!response.ok) {
        setError(await responseError(response, 'Wiederholung konnte nicht gestartet werden'));
        return;
      }
      const result = (await response.json()) as {
        pendingReleased: number;
        deadLettersRequeued: number;
        status: PrivacyOperations;
      };
      setPrivacyOperations(result.status);
      setPrivacyMessage(
        `${result.pendingReleased} wartende und ${result.deadLettersRequeued} fehlgeschlagene Vorgänge freigegeben.`,
      );
      event.currentTarget.reset();
    } catch {
      setError('Admin API ist nicht erreichbar. Wiederholung wurde nicht bestätigt.');
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
      <p style={{ color: '#c63d32', fontWeight: 800 }}>{t('MATIQ ADMIN')} </p>
      <h1>{t('Redaktion und Verwaltung')} </h1>
      <p>{t('Redaktion für MATIQ-Inhalte und Assessment-Regeln.')} </p>
      <form onSubmit={load} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <label>
          {t('E-Mail')} <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          {t('Passwort')}{' '}
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <label>
          {t('MFA-Code')} <input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" />
        </label>
        <button disabled={isSubmitting}>
          {isSubmitting ? t('Bitte warten…') : t('Dashboard laden')}
        </button>
      </form>
      {mfaSetupSecret && (
        <form
          onSubmit={confirmMfa}
          style={{ display: 'grid', gap: 12, maxWidth: 420, marginTop: 24 }}
        >
          <p>
            {t('Füge diesen geheimen Schlüssel in deine Authenticator-App ein:')}{' '}
            <code>{mfaSetupSecret}</code>
          </p>
          <label>
            {t('Bestätigungscode')}{' '}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              placeholder={t('123456')}
              title={t('Sechsstelliger Code aus der Authenticator-App')}
              required
            />
          </label>
          <button disabled={isSubmitting}>
            {isSubmitting ? t('Bitte warten…') : t('MFA aktivieren')}
          </button>
        </form>
      )}
      {error && <p style={{ color: '#a5221a' }}>{t(error)}</p>}
      {stats && <AdminStats stats={stats} />}
      {privacyOperations && (
        <section aria-labelledby="privacy-operations-heading" style={{ marginTop: 32 }}>
          <h2 id="privacy-operations-heading">{t('GDPR-Betriebsstatus')} </h2>
          <p>{t('Nur aggregierte technische Zustände, ohne Personen- oder Zahlungsdaten.')} </p>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              maxWidth: 900,
            }}
          >
            <div>
              <dt>{t('Geplante Löschungen')} </dt>
              <dd>{privacyOperations.scheduled}</dd>
            </div>
            <div>
              <dt>{t('Fällige Zeitpläne')} </dt>
              <dd>{privacyOperations.dueSchedules}</dd>
            </div>
            <div>
              <dt>{t('Löschung ausstehend')} </dt>
              <dd>{privacyOperations.pendingDeletion}</dd>
            </div>
            <div>
              <dt>{t('Outbox ausstehend')} </dt>
              <dd>{privacyOperations.pendingOutbox}</dd>
            </div>
            <div>
              <dt>{t('Verarbeitung festgefahren')} </dt>
              <dd>{privacyOperations.staleProcessing}</dd>
            </div>
            <div>
              <dt>{t('Fehlgeschlagene Inbox')} </dt>
              <dd>{privacyOperations.failedInbox}</dd>
            </div>
            <div>
              <dt>{t('Dead Letter')} </dt>
              <dd>{privacyOperations.privacyDeadLetters}</dd>
            </div>
            <div>
              <dt>{t('Verlängerung ausstehend')} </dt>
              <dd>{privacyOperations.renewalPending}</dd>
            </div>
            <div>
              <dt>{t('Manuelle Prüfung')} </dt>
              <dd>{privacyOperations.renewalReviewRequired}</dd>
            </div>
            <div>
              <dt>{t('Ältester Vorgang')} </dt>
              <dd>
                {privacyOperations.oldestPendingSeconds} {t('Sekunden')}{' '}
              </dd>
            </div>
          </dl>
          <form
            onSubmit={retryPrivacyOperations}
            style={{ display: 'grid', gap: 12, maxWidth: 420 }}
          >
            <label>
              {t('Bestätigung: RETRY')} <input name="confirmation" autoComplete="off" required />
            </label>
            <button disabled={isSubmitting}>
              {isSubmitting ? t('Bitte warten…') : t('Sichere Wiederholung starten')}
            </button>
          </form>
          {privacyMessage && <p role="status">{t(privacyMessage)}</p>}
        </section>
      )}
      {stats && !analyticsLoaded && <p>{t('Wiedergabestatistik wird geladen…')} </p>}
      {viewingAnalytics && <ViewingAnalytics data={viewingAnalytics} />}
    </main>
  );
}
