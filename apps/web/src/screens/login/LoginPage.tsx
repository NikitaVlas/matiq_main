'use client';

import { FormEvent, useState } from 'react';

const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      credentials: 'include',
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
        <h2>Willkommen zurück</h2>
        <form onSubmit={submit}>
          <label>
            E-Mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Passwort
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
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
