import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { RETENTION_DAYS, RetentionService } from '../src/retention-service.js';

describe('RetentionService', () => {
  it('uses the approved cutoffs and purges processed payloads before metadata', async () => {
    const deleted = vi.fn().mockResolvedValue({ count: 1 });
    const updated = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      emailVerificationToken: { deleteMany: deleted },
      passwordResetToken: { deleteMany: deleted },
      session: { deleteMany: deleted },
      verifiedWatchInterval: { deleteMany: deleted },
      playbackSession: { deleteMany: deleted },
      outboxEvent: { updateMany: updated, deleteMany: deleted },
      deadLetterJob: { findMany: vi.fn().mockResolvedValue([]), deleteMany: deleted },
      inboxJob: { findMany: vi.fn().mockResolvedValue([]), deleteMany: deleted },
      auditLog: { deleteMany: deleted },
      accountDeletionRequest: { deleteMany: deleted, updateMany: updated },
      deletionTombstone: { deleteMany: deleted },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;
    const now = new Date('2026-09-02T12:00:00.000Z');

    const result = await new RetentionService(db, 100, () => now).runOnce();

    expect(db.playbackSession.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date(now.getTime() - RETENTION_DAYS.playback * 86_400_000),
        },
      },
    });
    expect(db.outboxEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payload: { purged: true } } }),
    );
    expect(result).toMatchObject({ payloadsPurged: 1, deadLetters: 0, completedJobs: 0 });
  });
});
