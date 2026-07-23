import { ExecutionContext } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthGuard } from '../src/modules/admin-auth/admin-auth.guard';

const context = (cookie?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { cookie } }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

const session = {
  userId: 'admin-user',
  expiresAt: new Date(Date.now() + 60_000),
  user: {
    deletedAt: null,
    emailVerifiedAt: new Date(),
    role: 'ADMIN',
    mfaSecretEncrypted: 'encrypted-secret',
    mfaEnabledAt: new Date(),
  },
};
const reflector = { getAllAndOverride: () => undefined };

describe('AdminAuthGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects a missing session cookie', async () => {
    const db = { session: { findUnique: vi.fn() } };
    await expect(
      new AdminAuthGuard(db as never, reflector as never).canActivate(context()),
    ).rejects.toThrow();
    expect(db.session.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a session without an MFA-enabled administrator', async () => {
    const db = {
      session: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...session, user: { ...session.user, role: 'EDITOR' } }),
      },
    };
    await expect(
      new AdminAuthGuard(db as never, reflector as never).canActivate(
        context('matiq_session=session-token'),
      ),
    ).rejects.toThrow();
  });

  it('allows an active MFA-enabled administrator session', async () => {
    const db = { session: { findUnique: vi.fn().mockResolvedValue(session) } };
    await expect(
      new AdminAuthGuard(db as never, reflector as never).canActivate(
        context('matiq_session=session-token'),
      ),
    ).resolves.toBe(true);
  });
});
