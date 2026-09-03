'use client';

import { FormEvent, useEffect, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';
type Account = {
  email: string;
  emailVerified: boolean;
  athleteProfileCompleted: boolean;
  mfaEnabled: boolean;
};
type Session = { id: string; createdAt: string; lastSeenAt: string; current: boolean };
type MfaSetup = { secret: string; otpauthUrl: string };

const request = userApiResponse;

async function errorMessage(response: Response, fallback: string) {
  if (response.status === 401) return 'Deine Sitzung ist abgelaufen oder das Passwort ist falsch.';
  if (response.status === 429) return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ? `${fallback} (${body.message})` : fallback;
}

export default function AccountSettingsPage() {
  const [account, setAccount] = useState<Account>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [mfaSetup, setMfaSetup] = useState<MfaSetup>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function load() {
    const [accountResponse, sessionsResponse] = await Promise.all([
      request('/auth/me'),
      request('/auth/sessions'),
    ]);
    if (!accountResponse.ok || !sessionsResponse.ok) throw new Error('AUTH_REQUIRED');
    setAccount(await accountResponse.json());
    setSessions(await sessionsResponse.json());
  }

  useEffect(() => {
    void load()
      .catch(() => setError('Die Kontoeinstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  async function revokeSession(id: string) {
    setBusy(`session:${id}`);
    setError('');
    const response = await request(`/auth/sessions/${id}`, { method: 'DELETE' });
    if (!response.ok)
      setError(await errorMessage(response, 'Sitzung konnte nicht beendet werden.'));
    else {
      setSessions((current) => current.filter((session) => session.id !== id));
      setStatus('Sitzung beendet.');
    }
    setBusy('');
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    if (password !== data.get('passwordConfirmation')) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    setBusy('password');
    setError('');
    setStatus('');
    const response = await request('/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: data.get('currentPassword'), password }),
    });
    if (!response.ok)
      setError(await errorMessage(response, 'Passwort konnte nicht geändert werden.'));
    else {
      form.reset();
      setStatus('Passwort geändert. Alle anderen Sitzungen wurden beendet.');
      await load();
    }
    setBusy('');
  }

  async function startMfa() {
    setBusy('mfa');
    setError('');
    const response = await request('/auth/mfa/setup', { method: 'POST' });
    if (!response.ok)
      setError(await errorMessage(response, 'MFA-Einrichtung konnte nicht gestartet werden.'));
    else setMfaSetup(await response.json());
    setBusy('');
  }

  async function confirmMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy('mfa-confirm');
    setError('');
    const response = await request('/auth/mfa/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: new FormData(form).get('code') }),
    });
    if (!response.ok) setError(await errorMessage(response, 'Der MFA-Code ist ungültig.'));
    else {
      const result = (await response.json()) as { recoveryCodes: string[] };
      setRecoveryCodes(result.recoveryCodes);
      setMfaSetup(undefined);
      setAccount((current) => (current ? { ...current, mfaEnabled: true } : current));
      form.reset();
      setStatus('MFA wurde aktiviert. Bewahre die Wiederherstellungscodes sicher auf.');
    }
    setBusy('');
  }

  async function downloadExport() {
    setBusy('export');
    setError('');
    const response = await request('/auth/account/export');
    if (!response.ok)
      setError(await errorMessage(response, 'Export konnte nicht erstellt werden.'));
    else {
      const blob = new Blob([JSON.stringify(await response.json(), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `matiq-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Datenexport heruntergeladen.');
    }
    setBusy('');
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('confirmation') !== 'DELETE') {
      setError('Gib DELETE ein, um die Kontolöschung zu bestätigen.');
      return;
    }
    setBusy('delete');
    setError('');
    const reauthentication = await request('/auth/reauthenticate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: data.get('password') }),
    });
    if (!reauthentication.ok) {
      setError(await errorMessage(reauthentication, 'Erneute Anmeldung fehlgeschlagen.'));
      setBusy('');
      return;
    }
    const response = await request('/auth/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    if (!response.ok) {
      setError(await errorMessage(response, 'Konto konnte nicht gelöscht werden.'));
      setBusy('');
      return;
    }
    const result = (await response.json()) as {
      requestId: string;
      statusToken: string;
      statusTokenExpiresAt: string;
    };
    sessionStorage.setItem('matiq.accountDeletionStatus', JSON.stringify(result));
    window.location.assign('/account-deletion-status');
  }

  if (loading)
    return (
      <main className="settings-page" aria-busy="true">
        Kontoeinstellungen werden geladen...
      </main>
    );

  return (
    <main className="settings-page">
      <header className="settings-header">
        <p className="eyebrow">Konto</p>
        <h1>Einstellungen</h1>
        <p>Verwalte dein Profil, deine Sicherheit und deine persönlichen Daten.</p>
      </header>

      {error ? (
        <p className="settings-message error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="settings-message" role="status">
          {status}
        </p>
      ) : null}

      <section className="settings-card">
        <h2>Profil</h2>
        <dl className="settings-summary">
          <div>
            <dt>E-Mail</dt>
            <dd>{account?.email}</dd>
          </div>
          <div>
            <dt>Bestätigung</dt>
            <dd>{account?.emailVerified ? 'Bestätigt' : 'Nicht bestätigt'}</dd>
          </div>
        </dl>
        <a className="action-link" href="/onboarding/profile">
          Athletenprofil bearbeiten
        </a>
      </section>

      <section className="settings-card">
        <h2>Aktive Sitzungen</h2>
        <p>Beende Sitzungen auf Geräten, die du nicht mehr verwendest.</p>
        <ul className="settings-sessions">
          {sessions.map((session) => (
            <li key={session.id}>
              <span>
                <strong>{session.current ? 'Dieses Gerät' : 'Weitere Sitzung'}</strong>
                <br />
                Zuletzt aktiv: {new Date(session.lastSeenAt).toLocaleString('de-DE')}
              </span>
              {!session.current ? (
                <button
                  disabled={busy === `session:${session.id}`}
                  onClick={() => void revokeSession(session.id)}
                >
                  Sitzung beenden
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-card">
        <h2>Passwort ändern</h2>
        <form className="settings-form" onSubmit={(event) => void changePassword(event)}>
          <label>
            Aktuelles Passwort
            <input
              name="currentPassword"
              type="password"
              minLength={12}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Neues Passwort
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Neues Passwort wiederholen
            <input
              name="passwordConfirmation"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <p>Mindestens 12 Zeichen, Groß- und Kleinbuchstabe sowie eine Zahl.</p>
          <button disabled={busy === 'password'}>
            {busy === 'password' ? 'Wird geändert...' : 'Passwort ändern'}
          </button>
        </form>
      </section>

      <section className="settings-card">
        <h2>Zwei-Faktor-Authentifizierung</h2>
        {account?.mfaEnabled && !recoveryCodes.length ? (
          <p>MFA ist für dein Konto aktiviert.</p>
        ) : null}
        {!account?.mfaEnabled && !mfaSetup ? (
          <button disabled={busy === 'mfa'} onClick={() => void startMfa()}>
            MFA einrichten
          </button>
        ) : null}
        {mfaSetup ? (
          <form className="settings-form" onSubmit={(event) => void confirmMfa(event)}>
            <p>Füge diesen geheimen Schlüssel in deine Authenticator-App ein:</p>
            <code className="settings-secret">{mfaSetup.secret}</code>
            <label>
              Sechsstelliger MFA-Code
              <input
                name="code"
                inputMode="numeric"
                minLength={6}
                maxLength={16}
                required
                autoComplete="one-time-code"
              />
            </label>
            <button disabled={busy === 'mfa-confirm'}>MFA bestätigen</button>
          </form>
        ) : null}
        {recoveryCodes.length ? (
          <div className="settings-recovery">
            <h3>Wiederherstellungscodes</h3>
            <p>Jeder Code kann nur einmal verwendet werden. Speichere sie jetzt sicher.</p>
            <ul>
              {recoveryCodes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="settings-card">
        <h2>Deine Daten</h2>
        <p>
          Lade eine maschinenlesbare Kopie deiner Konto-, Assessment- und Trainingsdaten herunter.
        </p>
        <button disabled={busy === 'export'} onClick={() => void downloadExport()}>
          {busy === 'export' ? 'Export wird erstellt...' : 'Daten exportieren'}
        </button>
      </section>

      <section className="settings-card settings-danger">
        <h2>Konto löschen</h2>
        <p>
          Diese Aktion beendet alle Sitzungen und entfernt dein aktives Profil, Assessment und
          deinen Trainingsfortschritt dauerhaft.
        </p>
        <form className="settings-form" onSubmit={(event) => void deleteAccount(event)}>
          <label>
            Passwort zur Bestätigung
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Gib DELETE ein
            <input name="confirmation" required pattern="DELETE" autoComplete="off" />
          </label>
          <button className="danger-button" disabled={busy === 'delete'}>
            {busy === 'delete' ? 'Konto wird gelöscht...' : 'Konto endgültig löschen'}
          </button>
        </form>
      </section>
    </main>
  );
}
