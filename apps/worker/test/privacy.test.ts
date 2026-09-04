import { Prisma, type PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { createAccountDeletionHandler } from '../src/privacy.js';
import { reapplyDeletionLedger } from '../src/deletion-ledger.js';

describe('restored deletion receipt retention', () => {
  it.each([null, new Date('2025-12-31T23:59:59Z')])(
    'uses completion year and preserves an existing completion: %s',
    async (existingCompletion) => {
      const upsert = vi.fn();
      const auditUpdate = vi.fn();
      const repository = {
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      };
      const tx = {
        ...Object.fromEntries(
          [
            'verifiedWatchInterval',
            'playbackSession',
            'videoWatch',
            'assessmentAttempt',
            'assessment',
            'athleteProfile',
            'trainerProfile',
            'course',
            'video',
            'session',
            'emailVerificationToken',
            'passwordResetToken',
            'mfaRecoveryCode',
            'user',
            'auditLog',
          ].map((name) => [name, repository]),
        ),
        accountDeletionRequest: {
          findUnique: vi
            .fn()
            .mockResolvedValue(existingCompletion ? { completedAt: existingCompletion } : null),
          upsert,
        },
        auditLog: { create: vi.fn(), updateMany: auditUpdate },
      };
      const db = {
        deletionTombstone: { upsert: vi.fn() },
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'synthetic-user' }) },
        $transaction: vi.fn(async (callback) => callback(tx)),
      } as unknown as PrismaClient;
      const now = new Date('2026-01-01T00:00:00Z');
      await reapplyDeletionLedger(
        db,
        {
          version: 1,
          exportedAt: now.toISOString(),
          tombstones: [
            {
              subjectRef: 'synthetic-subject',
              requestedAt: '2025-12-30T00:00:00Z',
              retainUntil: '2026-02-03T00:00:00Z',
            },
          ],
        },
        now,
      );
      const completedAt = existingCompletion ?? now;
      expect(auditUpdate).toHaveBeenCalledExactlyOnceWith({
        where: {
          OR: [
            { actor: 'synthetic-user' },
            { entityId: 'synthetic-user' },
            { actor: 'subject:synthetic-subject' },
          ],
        },
        data: { actor: 'subject:synthetic-subject', entityId: null, metadata: Prisma.DbNull },
      });
      const retainUntil = new Date(
        existingCompletion ? '2029-01-01T00:00:00Z' : '2030-01-01T00:00:00Z',
      );
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ completedAt, retainUntil }),
          update: expect.objectContaining({ completedAt, retainUntil }),
        }),
      );
    },
  );
});

describe('account deletion handler', () => {
  it('removes product data, detaches authorship, and completes an unlinkable receipt', async () => {
    const request = {
      id: 'request-1',
      userId: 'user-1',
      subjectRef: 'subject-1',
      requestedAt: new Date(),
      completedAt: null,
      retainUntil: new Date('2030-01-01'),
    };
    const repositories = {
      verifiedWatchInterval: { deleteMany: vi.fn() },
      playbackSession: { deleteMany: vi.fn() },
      videoWatch: { deleteMany: vi.fn() },
      assessmentAttempt: { deleteMany: vi.fn() },
      assessment: { deleteMany: vi.fn() },
      athleteProfile: { deleteMany: vi.fn() },
      trainerProfile: { deleteMany: vi.fn() },
      course: { updateMany: vi.fn() },
      video: { updateMany: vi.fn() },
      auditLog: { create: vi.fn(), updateMany: vi.fn() },
      accountDeletionRequest: { updateMany: vi.fn() },
    };
    const db = {
      accountDeletionRequest: { findUnique: vi.fn().mockResolvedValue(request) },
      subscription: { findMany: vi.fn().mockResolvedValue([{ providerCustomerId: 'cus_1' }]) },
      $transaction: vi.fn(async (value) =>
        typeof value === 'function' ? value(repositories) : Promise.all(value),
      ),
    } as unknown as PrismaClient;
    const processor = { name: 'test-provider', eraseAccount: vi.fn().mockResolvedValue(undefined) };

    await createAccountDeletionHandler(db, [processor])({
      requestId: request.id,
      userId: request.userId,
    });

    expect(repositories.playbackSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: request.userId },
    });
    expect(repositories.auditLog.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { actor: request.userId },
          { entityId: request.userId },
          { actor: `subject:${request.subjectRef}` },
        ],
      },
      data: { actor: `subject:${request.subjectRef}`, entityId: null, metadata: Prisma.DbNull },
    });
    expect(repositories.course.updateMany).toHaveBeenCalledWith({
      where: { trainerId: request.userId },
      data: { trainerId: null },
    });
    expect(processor.eraseAccount).toHaveBeenCalledWith({
      subjectRef: request.subjectRef,
      providerCustomerIds: ['cus_1'],
    });
    expect(repositories.accountDeletionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
    );
  });

  it('is idempotent after completion', async () => {
    const db = {
      accountDeletionRequest: {
        findUnique: vi.fn().mockResolvedValue({ completedAt: new Date() }),
      },
      subscription: { findMany: vi.fn() },
    } as unknown as PrismaClient;
    await expect(
      createAccountDeletionHandler(db)({ requestId: 'request-1', userId: 'user-1' }),
    ).resolves.toBeUndefined();
  });
});
