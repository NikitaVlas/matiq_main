import {
  decryptTransactionalEmail,
  type EncryptedEmailEnvelope,
  type TransactionalEmail,
} from '@matiq/backend';
import type { EventHandler } from './types.js';
import { createHash } from 'node:crypto';
import { BrevoEmailProvider } from './brevo-email-provider.js';

export interface EmailProvider {
  send(message: TransactionalEmail, idempotencyKey?: string): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: TransactionalEmail) {
    console.info(JSON.stringify({ message: 'email_accepted', kind: message.kind }));
  }
}

export function configuredEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? 'console';
  if (provider === 'brevo') {
    return new BrevoEmailProvider(
      process.env.BREVO_API_KEY ?? '',
      process.env.EMAIL_FROM_ADDRESS ?? '',
      process.env.EMAIL_FROM_NAME ?? 'MATIQ',
    );
  }
  if (provider !== 'console') throw new Error('EMAIL_PROVIDER_INVALID');
  return new ConsoleEmailProvider();
}

export function createEmailHandler(provider: EmailProvider): EventHandler {
  return async (payload) => {
    const message = decryptTransactionalEmail(payload as EncryptedEmailEnvelope);
    // The encrypted envelope stays identical across retries; no recipient/token in the key.
    const digest = createHash('sha256')
      .update((payload as EncryptedEmailEnvelope).ciphertext)
      .digest('hex');
    // Brevo limits the key length; 128 bits retain ample collision resistance.
    await provider.send(message, digest.slice(0, 32));
  };
}
