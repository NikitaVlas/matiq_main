'use client';

import { FormEvent, useState } from 'react';
import { adminApi, userApiUrl } from '../../shared/api/client';
import { AdminStats } from '../../widgets/admin-stats/ui/AdminStats';

export default function AdminHome() {
  const [mfaSetupSecret, setMfaSetupSecret] = useState('');
  const [stats, setStats] = useState<{
    users: number;
    trainers: number;
    videos: number;
    activeAssessmentQuestions: number;
  } | null>(null);
  const [error, setError] = useState('');

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const login = await fetch(`${userApiUrl}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
        mfaCode: data.get('mfaCode') || undefined,
      }),
    });
    if (!login.ok) {
      setError('Anmeldung oder MFA-Code ist ungültig.');
      return;
    }
    const loginResult = (await login.json()) as { mfaSetupRequired: boolean };
    if (loginResult.mfaSetupRequired) {
      const setup = await fetch(`${userApiUrl}/auth/mfa/setup`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!setup.ok) {
        setError('MFA-Einrichtung konnte nicht gestartet werden.');
        return;
      }
      setMfaSetupSecret((await setup.json()).secret);
      return;
    }
    const response = await adminApi('/admin/stats');
    if (!response.ok) {
      setError('Dieses Konto hat keinen Administratorzugriff.');
      return;
    }
    setStats(await response.json());
  }

  async function confirmMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${userApiUrl}/auth/mfa/confirm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: data.get('code') }),
    });
    if (!response.ok) setError('Der MFA-Code ist ungültig.');
    else {
      setMfaSetupSecret('');
      setError('MFA ist aktiviert. Bitte erneut mit dem MFA-Code anmelden.');
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
        <button>Dashboard laden</button>
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
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </label>
          <button>MFA aktivieren</button>
        </form>
      )}
      {error && <p style={{ color: '#a5221a' }}>{error}</p>}
      {stats && <AdminStats stats={stats} />}
    </main>
  );
}
