import type { InboxJob, PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { IdempotentConsumer } from '../src/idempotent-consumer.js';
import type { WorkerEvent } from '../src/types.js';

const event: WorkerEvent = { outboxEventId: 'event-1', topic: 'system.noop', payload: {} };
const inbox = {
  id: 'inbox-1',
  outboxEventId: event.outboxEventId,
  topic: event.topic,
  status: 'PROCESSING',
  attempts: 1,
  lastError: null,
  startedAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies InboxJob;

function job(attemptsMade = 0, attempts = 5) {
  return { data: event, attemptsMade, opts: { attempts } } as Job<WorkerEvent>;
}

describe('IdempotentConsumer', () => {
  it('does not execute a completed event again', async () => {
    const handler = vi.fn();
    const db = {
      inboxJob: { findUnique: vi.fn().mockResolvedValue({ ...inbox, status: 'COMPLETED' }) },
    } as unknown as PrismaClient;

    await new IdempotentConsumer(db, new Map([[event.topic, handler]])).process(job());
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not reclaim an event completed during a competing delivery', async () => {
    const handler = vi.fn();
    const completed = { ...inbox, status: 'COMPLETED' as const, completedAt: new Date() };
    const db = {
      inboxJob: {
        findUnique: vi.fn().mockResolvedValue({ ...inbox, status: 'FAILED' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(completed),
      },
    } as unknown as PrismaClient;

    await new IdempotentConsumer(db, new Map([[event.topic, handler]])).process(job());
    expect(handler).not.toHaveBeenCalled();
  });

  it('marks a successfully handled event completed', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue({ ...inbox, status: 'COMPLETED' });
    const db = {
      inboxJob: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(inbox),
        update,
      },
    } as unknown as PrismaClient;

    await new IdempotentConsumer(db, new Map([[event.topic, handler]])).process(job());
    expect(handler).toHaveBeenCalledWith(event.payload);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: inbox.id },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('creates one dead-letter record on the final failed attempt', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    const inboxUpdate = vi.fn().mockResolvedValue({ ...inbox, status: 'DEAD_LETTER' });
    const deadLetterUpsert = vi.fn().mockResolvedValue({ id: 'dead-1' });
    const transaction = vi.fn(async (callback) =>
      callback({ inboxJob: { update: inboxUpdate }, deadLetterJob: { upsert: deadLetterUpsert } }),
    );
    const db = {
      inboxJob: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(inbox),
      },
      $transaction: transaction,
    } as unknown as PrismaClient;

    await expect(
      new IdempotentConsumer(db, new Map([[event.topic, handler]])).process(job(4, 5)),
    ).rejects.toThrow('provider unavailable');
    expect(inboxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'DEAD_LETTER', lastError: 'provider unavailable' },
      }),
    );
    expect(deadLetterUpsert).toHaveBeenCalledTimes(1);
  });
});
