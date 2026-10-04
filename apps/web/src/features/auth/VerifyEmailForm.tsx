'use client';

import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApiResponse } from '../../shared/api/client';

export function VerifyEmailForm({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initialToken || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const response = await userApiResponse('/auth/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: initialToken }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        setError(
          response.status >= 500 || response.status === 429
            ? 'Die Bestätigung ist gerade nicht möglich. Bitte versuche es später erneut.'
            : 'Dieser Link ist ungültig oder abgelaufen. Öffne die neueste E-Mail von MATIQ.',
        );
        return;
      }
      router.replace('/onboarding/profile');
    } catch {
      setError('Keine Verbindung. Bitte prüfe deine Internetverbindung und versuche es erneut.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <main className="verification-page">
      <section className="verification-panel" aria-labelledby="verification-title">
        <p className="eyebrow">DEIN START MIT MATIQ</p>
        <p className="verification-step">01 / E-MAIL BESTÄTIGEN</p>
        <h1 id="verification-title">Ein Klick. Dann geht’s auf die Matte.</h1>
        <p className="verification-description">
          {initialToken
            ? 'Bestätige deine E-Mail-Adresse. Danach richtest du dein persönliches Trainingsprofil ein.'
            : 'Öffne den Bestätigungslink aus deiner E-Mail, um dein Trainingsprofil einzurichten.'}
        </p>
        {initialToken && (
          <form onSubmit={submit} aria-busy={pending}>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button disabled={pending}>{pending ? 'Wird bestätigt …' : 'E-Mail bestätigen'}</button>
          </form>
        )}
        <p className="verification-help">
          Bereits bestätigt? <Link href="/login">Zur Anmeldung</Link>
        </p>
      </section>
      <p className="verification-footer">BJJ Gi & No-Gi · Dein Training. Dein Weg.</p>
    </main>
  );
}
