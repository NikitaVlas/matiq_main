import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RoleService } from '../src/modules/roles/role.service';

const user = { id: 'user-1', role: 'ATHLETE' };

function service(overrides: Record<string, unknown> = {}) {
  const db = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      count: vi.fn().mockResolvedValue(2),
      update: vi.fn().mockResolvedValue({ id: user.id, role: 'EDITOR' }),
    },
    ...overrides,
  };
  const audit = { record: vi.fn().mockResolvedValue({}) };
  return { roles: new RoleService(db as never, audit as never), db, audit };
}

describe('RoleService', () => {
  it('changes a role and records the actual administrator as actor', async () => {
    const { roles, audit } = service();
    await expect(roles.changeRole('admin-1', user.id, 'EDITOR')).resolves.toEqual({
      id: user.id,
      role: 'EDITOR',
    });
    expect(audit.record).toHaveBeenCalledWith('USER_ROLE_CHANGED', 'User', user.id, 'admin-1', {
      from: 'ATHLETE',
      to: 'EDITOR',
    });
  });

  it('prevents demoting the final active administrator', async () => {
    const { roles } = service({
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn(),
      },
    });
    await expect(roles.changeRole('admin-1', 'admin-1', 'EDITOR')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
