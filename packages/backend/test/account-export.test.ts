import { describe, expect, it } from 'vitest';
import {
  accountExportExpiresAt,
  accountExportTokenHash,
  decryptAccountExport,
  encryptAccountExport,
} from '../src/privacy/account-export';

describe('account export protection', () => {
  const key = Buffer.alloc(32, 7);

  it('encrypts and authenticates the export document', () => {
    const document = { account: { email: 'athlete@example.de' }, assessment: [1, 2] };
    const encrypted = encryptAccountExport(document, key);

    expect(encrypted.ciphertext.toString()).not.toContain('athlete@example.de');
    expect(JSON.parse(decryptAccountExport(encrypted, key))).toEqual(document);
    expect(() => decryptAccountExport({ ...encrypted, authTag: Buffer.alloc(16) }, key)).toThrow();
  });

  it('uses deterministic token hashes and a seven-day expiry', () => {
    expect(accountExportTokenHash('token')).toBe(accountExportTokenHash('token'));
    expect(accountExportExpiresAt(new Date('2026-09-07T00:00:00Z')).toISOString()).toBe(
      '2026-09-14T00:00:00.000Z',
    );
  });

  it('requires an explicit valid key in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => encryptAccountExport({}, undefined)).toThrow(
        'ACCOUNT_EXPORT_ENCRYPTION_KEY_INVALID',
      );
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
