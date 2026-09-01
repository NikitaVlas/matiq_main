import {
  decryptTransactionalEmail,
  type EncryptedEmailEnvelope,
  type TransactionalEmail,
} from '@matiq/backend';
import type { EventHandler } from './types.js';

export interface EmailProvider {
  send(message: TransactionalEmail): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: TransactionalEmail) {
    console.info(JSON.stringify({ message: 'email_accepted', kind: message.kind }));
  }
}

export function configuredEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? 'console';
  if (provider !== 'console') throw new Error('EMAIL_PROVIDER_INVALID');
  return new ConsoleEmailProvider();
}

export function createEmailHandler(provider: EmailProvider): EventHandler {
  return async (payload) => {
    const message = decryptTransactionalEmail(payload as EncryptedEmailEnvelope);
    await provider.send(message);
  };
}
