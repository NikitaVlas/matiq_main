import { ExecutionContext } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminAuthGuard } from '../src/modules/admin-auth/admin-auth.guard';

const context = (key?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-admin-key': key } }) }),
  }) as unknown as ExecutionContext;

describe('AdminAuthGuard', () => {
  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it('rejects requests when no key is configured', () => {
    expect(() => new AdminAuthGuard().canActivate(context('anything'))).toThrow();
  });

  it('rejects a missing or incorrect key', () => {
    process.env.ADMIN_API_KEY = 'local-admin-secret';
    expect(() => new AdminAuthGuard().canActivate(context())).toThrow();
    expect(() => new AdminAuthGuard().canActivate(context('wrong'))).toThrow();
  });

  it('allows the configured key', () => {
    process.env.ADMIN_API_KEY = 'local-admin-secret';
    expect(new AdminAuthGuard().canActivate(context('local-admin-secret'))).toBe(true);
  });
});
