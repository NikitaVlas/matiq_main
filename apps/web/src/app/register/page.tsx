'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000'}/auth/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      },
    );
    const body = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(body.message ?? 'Registrierung fehlgeschlagen.');
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(String(data.get('email')))}`);
  }

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Konto erstellen</p>
        <h2>Starte deine Roadmap</h2>
        <form onSubmit={submit}>
          <label>
            E-Mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Passwort
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <small>Mindestens 12 Zeichen, Groß- und Kleinbuchstabe sowie eine Zahl.</small>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={pending}>{pending ? 'Wird erstellt …' : 'Konto erstellen'}</button>
          <a href="/login">Ich habe bereits ein Konto</a>
        </form>
      </section>
    </main>
  );
}
