import { describe, expect, it } from 'vitest';
import {
  createTransactionalEmail,
  decryptTransactionalEmail,
  encryptTransactionalEmail,
} from '../src/email/transactional-email';

describe('transactional email envelope', () => {
  it('round-trips without exposing the recipient or token in ciphertext', () => {
    const message = createTransactionalEmail(
      'RESET_PASSWORD',
      'athlete@example.de',
      'raw-secret-token',
    );
    const envelope = encryptTransactionalEmail(message);

    expect(JSON.stringify(envelope)).not.toContain('athlete@example.de');
    expect(JSON.stringify(envelope)).not.toContain('raw-secret-token');
    expect(decryptTransactionalEmail(envelope)).toEqual(message);
  });

  it('requires a valid explicit key in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() =>
        encryptTransactionalEmail(
          createTransactionalEmail('VERIFY_EMAIL', 'athlete@example.de', 'token'),
          undefined,
        ),
      ).toThrow('EMAIL_ENCRYPTION_KEY_INVALID');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
