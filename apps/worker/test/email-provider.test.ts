import { createTransactionalEmail, encryptTransactionalEmail } from '@matiq/backend';
import { describe, expect, it, vi } from 'vitest';
import { createEmailHandler, type EmailProvider } from '../src/email-provider.js';

describe('email.send.v1 handler', () => {
  it('decrypts and validates a German verification message', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const provider: EmailProvider = { send };
    const message = createTransactionalEmail(
      'VERIFY_EMAIL',
      'athlete@example.de',
      'secret-token',
      'https://matiq.example',
    );

    await createEmailHandler(provider)(encryptTransactionalEmail(message));

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'VERIFY_EMAIL',
        to: 'athlete@example.de',
        subject: 'Bestätige deine E-Mail-Adresse bei MATIQ',
      }),
    );
  });

  it('rejects a tampered envelope before calling the provider', async () => {
    const send = vi.fn();
    const provider: EmailProvider = { send };
    const envelope = encryptTransactionalEmail(
      createTransactionalEmail('RESET_PASSWORD', 'athlete@example.de', 'secret-token'),
    );

    await expect(
      createEmailHandler(provider)({ ...envelope, ciphertext: `${envelope.ciphertext}tampered` }),
    ).rejects.toThrow('INVALID_EMAIL_ENVELOPE');
    expect(send).not.toHaveBeenCalled();
  });
});
