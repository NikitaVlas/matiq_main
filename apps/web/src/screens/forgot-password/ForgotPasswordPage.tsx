'use client';

import { FormEvent, useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    await userApiResponse('/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: data.get('email') }),
    });
    setPending(false);
    setSent(true);
  }
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">Passwort</p>
        <h2>Passwort zurücksetzen</h2>
        {sent ? (
          <p className="success">Wenn ein Konto existiert, haben wir einen Link gesendet.</p>
        ) : (
          <form onSubmit={submit}>
            <label>
              E-Mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button disabled={pending}>{pending ? 'Wird gesendet …' : 'Link senden'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
