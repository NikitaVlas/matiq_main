'use client';

import { FormEvent, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await userApiResponse('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    });
    setPending(false);
    if (response.ok) window.location.assign('/dashboard');
    else setError('E-Mail-Adresse oder Passwort ist nicht korrekt.');
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Anmelden</p>
        <h1>Willkommen zurück</h1>
        <form onSubmit={submit}>
          <label>
            E-Mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <div>
            <label htmlFor="login-password">Passwort</label>
            <div className="password-field">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-visibility"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                aria-controls="login-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={pending}>{pending ? 'Anmeldung …' : 'Anmelden'}</button>
          <a href="/forgot-password">Passwort vergessen?</a>
          <a href="/register">Noch kein Konto?</a>
        </form>
      </section>
    </main>
  );
}
