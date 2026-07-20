'use client';

import { useState } from 'react';
const api = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export default function ResendVerificationForm({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent'>('idle');
  async function resend() {
    setStatus('pending');
    await fetch(`${api}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setStatus('sent');
  }
  return (
    <button type="button" disabled={!email || status !== 'idle'} onClick={resend}>
      {status === 'sent' ? 'E-Mail erneut gesendet' : 'E-Mail erneut senden'}
    </button>
  );
}
