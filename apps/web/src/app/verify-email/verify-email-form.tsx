'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function VerifyEmailForm({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get('token'));
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000'}/auth/verify-email`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      },
    );
    if (!response.ok) {
      setError('Der Link ist ungültig oder abgelaufen.');
      return;
    }
    router.push('/onboarding/profile');
  }

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">E-Mail bestätigen</p>
        <h2>Bestätige deine Adresse</h2>
        <p>Öffne den Link aus deiner E-Mail. Im lokalen Modus ist der Token bereits eingetragen.</p>
        <form onSubmit={submit}>
          <label>
            Bestätigungscode
            <input name="token" defaultValue={initialToken} required />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button>E-Mail bestätigen</button>
        </form>
      </section>
    </main>
  );
}
