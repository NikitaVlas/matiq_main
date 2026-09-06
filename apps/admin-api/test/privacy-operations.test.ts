import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ADMIN_ROLES_KEY } from '../src/modules/admin-auth/admin-roles.decorator';
import { PrivacyOperationsController } from '../src/modules/privacy-operations/privacy-operations.controller';

describe('PrivacyOperationsController', () => {
  it('is restricted to Admin and returns aggregate service data', async () => {
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, PrivacyOperationsController)).toEqual(['ADMIN']);
    const status = vi.fn().mockResolvedValue({ pendingDeletion: 1 });
    const controller = new PrivacyOperationsController({ status } as never);
    await expect(controller.status()).resolves.toEqual({ pendingDeletion: 1 });
  });

  it('requires exact confirmation and recent reauthentication for retries', async () => {
    const retry = vi.fn();
    const controller = new PrivacyOperationsController({ retry } as never);
    expect(() =>
      controller.retry({ confirmation: 'NO' } as never, {
        adminUserId: 'admin-1',
        reauthenticatedAt: new Date(),
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      controller.retry(
        { confirmation: 'RETRY' },
        {
          adminUserId: 'admin-1',
          reauthenticatedAt: new Date(Date.now() - 16 * 60_000),
        },
      ),
    ).toThrow(UnauthorizedException);
    expect(retry).not.toHaveBeenCalled();
  });

  it('passes only the authenticated Admin id to the retry service', async () => {
    const retry = vi.fn().mockResolvedValue({ pendingReleased: 0, deadLettersRequeued: 0 });
    const controller = new PrivacyOperationsController({ retry } as never);
    await controller.retry(
      { confirmation: 'RETRY' },
      {
        adminUserId: 'admin-1',
        reauthenticatedAt: new Date(),
      },
    );
    expect(retry).toHaveBeenCalledExactlyOnceWith('admin-1');
  });
});
