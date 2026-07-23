import { describe, expect, it, vi } from 'vitest';
import { bootstrapAdmin } from '../src/scripts/bootstrap-admin';

describe('bootstrapAdmin', () => {
  it('creates a verified Admin only when none exists', async () => {
    const db = {
      user: {
        count: vi.fn().mockResolvedValue(0),
        create: vi
          .fn()
          .mockResolvedValue({ id: 'admin-1', email: 'admin@example.de', role: 'ADMIN' }),
      },
    };
    await expect(
      bootstrapAdmin(db as never, 'Admin@Example.de', 'SicheresPasswort1'),
    ).resolves.toEqual({
      id: 'admin-1',
      email: 'admin@example.de',
      role: 'ADMIN',
    });
  });

  it('refuses to create a second active Admin', async () => {
    const db = { user: { count: vi.fn().mockResolvedValue(1), create: vi.fn() } };
    await expect(
      bootstrapAdmin(db as never, 'admin@example.de', 'SicheresPasswort1'),
    ).rejects.toThrow('bootstrap is disabled');
  });
});
