'use client';

import { useState } from 'react';
import { userApiResponse } from '../../shared/api/client';

export default function ResendVerificationForm({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent'>('idle');
  async function resend() {
    setStatus('pending');
    await userApiResponse('/auth/resend-verification', {
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
