'use client';

import { FormEvent, useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${api}/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: data.get('password') }),
    });
    setStatus(response.ok ? 'success' : 'error');
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Sicherheit</p>
        <h2>Neues Passwort</h2>
        {status === 'success' ? (
          <p className="success">
            Dein Passwort wurde geändert. <a href="/login">Jetzt anmelden</a>
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Neues Passwort
              <input
                name="password"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            {status === 'error' && (
              <p className="error" role="alert">
                Der Link ist ungültig oder abgelaufen.
              </p>
            )}
            <button disabled={!token || status === 'pending'}>Passwort speichern</button>
          </form>
        )}
      </section>
    </main>
  );
}
