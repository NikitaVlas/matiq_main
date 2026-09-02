import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { createAccountDeletionHandler } from '../src/privacy.js';

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
