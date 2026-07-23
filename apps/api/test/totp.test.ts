import { describe, expect, it } from 'vitest';
import { verifyTotp } from '../src/modules/identity/infrastructure/totp';

describe('TOTP verification', () => {
  it('accepts the RFC 6238 SHA-1 test vector and rejects an invalid code', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const timestamp = 59_000;
    expect(verifyTotp(secret, '287082', timestamp)).toBe(true);
    expect(verifyTotp(secret, '000000', timestamp)).toBe(false);
  });
});
