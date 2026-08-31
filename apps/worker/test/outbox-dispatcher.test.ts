import type { OutboxEvent, PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { OutboxDispatcher } from '../src/outbox-dispatcher.js';
import type { WorkerEvent } from '../src/types.js';

describe('OutboxDispatcher', () => {
  it('publishes with the stable event id and marks the outbox record', async () => {
    const event = {
      id: 'event-1',
      topic: 'system.noop',
      payload: { source: 'test' },
      idempotencyKey: 'noop:test',
      status: 'PENDING',
      availableAt: new Date(),
      publishedAt: null,
      publishAttempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies OutboxEvent;
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      $transaction: vi.fn(async (callback) =>
        callback({ $queryRaw: vi.fn().mockResolvedValue([event]) }),
      ),
      outboxEvent: { updateMany },
    } as unknown as PrismaClient;
    const add = vi.fn().mockResolvedValue({ id: event.id });
    const dispatcher = new OutboxDispatcher(db, { add } as unknown as Pick<
      Queue<WorkerEvent>,
      'add'
    >);

    await expect(dispatcher.dispatchBatch()).resolves.toBe(1);
    expect(add).toHaveBeenCalledWith(
      'system.noop',
      expect.objectContaining({ outboxEventId: event.id }),
      expect.objectContaining({ jobId: event.id, attempts: 5, removeOnFail: false }),
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id, status: 'PENDING' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });

  it('keeps a failed publication pending and delays the next attempt', async () => {
    const event = {
      id: 'event-2',
      topic: 'system.noop',
      payload: {},
      idempotencyKey: 'noop:failed',
      status: 'PENDING',
      availableAt: new Date(),
      publishedAt: null,
      publishAttempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies OutboxEvent;
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      $transaction: vi.fn(async (callback) =>
        callback({ $queryRaw: vi.fn().mockResolvedValue([event]) }),
      ),
      outboxEvent: { updateMany },
    } as unknown as PrismaClient;
    const dispatcher = new OutboxDispatcher(db, {
      add: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    } as unknown as Pick<Queue<WorkerEvent>, 'add'>);

    await expect(dispatcher.dispatchBatch()).resolves.toBe(1);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id, status: 'PENDING' },
        data: expect.objectContaining({ lastError: 'redis unavailable' }),
      }),
    );
  });
});
