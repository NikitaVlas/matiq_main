import type { PrismaClient } from '@prisma/client';
import { decryptAccountExport } from '@matiq/backend';
import { describe, expect, it, vi } from 'vitest';
import { createAccountExportHandler } from '../src/account-export.js';

describe('account export worker', () => {
  it('builds an encrypted, expiring export and records readiness', async () => {
    const key = Buffer.alloc(32, 9);
    process.env.ACCOUNT_EXPORT_ENCRYPTION_KEY = key.toString('base64');
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const createAudit = vi.fn().mockResolvedValue({});
    const db = {
      accountExportRequest: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'export-1', userId: 'user-1', status: 'PENDING' }),
        updateMany,
      },
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          email: 'athlete@example.de',
          role: 'ATHLETE',
          emailVerifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          athleteProfile: null,
          assessment: null,
          assessmentAttempts: [],
          subscriptions: [],
          videoWatches: [],
          playbackSessions: [],
          verifiedWatchIntervals: [],
          trainerProfile: null,
          authoredCourses: [],
          authoredVideos: [],
          trainerAgreements: [],
          trainerPayoutReports: [],
        }),
      },
      auditLog: { create: createAudit },
    } as unknown as PrismaClient;

    await createAccountExportHandler(db)({ requestId: 'export-1', userId: 'user-1' });

    const data = updateMany.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ status: 'READY', failureCode: null });
    expect(JSON.parse(decryptAccountExport(data, key)).account.email).toBe('athlete@example.de');
    expect(createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ACCOUNT_EXPORT_READY' }),
      }),
    );
  });
});
