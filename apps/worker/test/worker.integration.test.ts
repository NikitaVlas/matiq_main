import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdempotentConsumer } from '../src/idempotent-consumer.js';
import { OutboxDispatcher } from '../src/outbox-dispatcher.js';
import type { HandlerRegistry, WorkerEvent } from '../src/types.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Worker integration tests require a disposable matiq_test database.');
}

describe('Worker outbox lifecycle', () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const queueName = `matiq-integration-${runId}`;
  const db = new PrismaClient();
  const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  const queue = new Queue<WorkerEvent>(queueName, { connection });
  const handled: string[] = [];
  const handlers: HandlerRegistry = new Map([
    [
      'system.noop',
      async (payload) => {
        handled.push(JSON.stringify(payload));
      },
    ],
  ]);
  const consumer = new IdempotentConsumer(db, handlers);
  const worker = new Worker<WorkerEvent>(queueName, (job) => consumer.process(job), { connection });
  const dispatcher = new OutboxDispatcher(db, queue);

  beforeAll(async () => {
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await connection.quit();
    await db.deadLetterJob.deleteMany({
      where: { inboxJob: { outboxEvent: { idempotencyKey: { startsWith: runId } } } },
    });
    await db.inboxJob.deleteMany({
      where: { outboxEvent: { idempotencyKey: { startsWith: runId } } },
    });
    await db.outboxEvent.deleteMany({ where: { idempotencyKey: { startsWith: runId } } });
    await db.$disconnect();
  });

  it('publishes, processes, and deduplicates one outbox event', async () => {
    const event = await db.outboxEvent.create({
      data: {
        topic: 'system.noop',
        payload: { runId },
        idempotencyKey: `${runId}:success`,
      },
    });
    await expect(dispatcher.dispatchBatch()).resolves.toBe(1);
    await waitFor(
      async () =>
        (await db.inboxJob.findUnique({ where: { outboxEventId: event.id } }))?.status ===
        'COMPLETED',
    );
    expect(handled).toEqual([JSON.stringify({ runId })]);

    await queue.add(
      event.topic,
      { outboxEventId: event.id, topic: event.topic, payload: event.payload },
      { jobId: event.id, attempts: 1, removeOnComplete: false },
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(handled).toHaveLength(1);
    await expect(
      db.inboxJob.findUniqueOrThrow({ where: { outboxEventId: event.id } }),
    ).resolves.toMatchObject({ status: 'COMPLETED', attempts: 1 });
  });

  it('persists unsupported final attempts as dead-letter', async () => {
    const event = await db.outboxEvent.create({
      data: {
        topic: 'unsupported.topic',
        payload: { privateValue: 'must-not-be-copied' },
        idempotencyKey: `${runId}:dead-letter`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await queue.add(
      event.topic,
      { outboxEventId: event.id, topic: event.topic, payload: event.payload },
      { jobId: event.id, attempts: 1, removeOnFail: false },
    );
    await waitFor(
      async () =>
        (await db.inboxJob.findUnique({ where: { outboxEventId: event.id } }))?.status ===
        'DEAD_LETTER',
    );
    await expect(
      db.deadLetterJob.findFirstOrThrow({ where: { inboxJob: { outboxEventId: event.id } } }),
    ).resolves.toMatchObject({ topic: event.topic, error: 'UNSUPPORTED_WORKER_TOPIC' });
  });
});

async function waitFor(condition: () => Promise<boolean>) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('WORKER_INTEGRATION_TIMEOUT');
}
