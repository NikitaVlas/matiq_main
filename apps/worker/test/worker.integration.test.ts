import { PrismaClient } from '@prisma/client';
import {
  createTransactionalEmail,
  encryptTransactionalEmail,
  MetricsRegistry,
} from '@matiq/backend';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdempotentConsumer } from '../src/idempotent-consumer.js';
import { OutboxDispatcher } from '../src/outbox-dispatcher.js';
import type { HandlerRegistry, WorkerEvent } from '../src/types.js';
import { WorkerObservabilityServer } from '../src/observability-server.js';
import { createEmailHandler, type EmailProvider } from '../src/email-provider.js';
import { createAccountDeletionHandler } from '../src/privacy.js';
import { exportDeletionLedger, reapplyDeletionLedger } from '../src/deletion-ledger.js';

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
  const deliveredEmails: string[] = [];
  const emailProvider: EmailProvider = {
    send: async (message) => {
      deliveredEmails.push(message.to);
    },
  };
  const handlers: HandlerRegistry = new Map([
    [
      'system.noop',
      async (payload) => {
        handled.push(JSON.stringify(payload));
      },
    ],
    ['email.send.v1', createEmailHandler(emailProvider)],
    ['privacy.account-delete.v1', createAccountDeletionHandler(db)],
  ]);
  const consumer = new IdempotentConsumer(db, handlers);
  const worker = new Worker<WorkerEvent>(queueName, (job) => consumer.process(job), { connection });
  const dispatcher = new OutboxDispatcher(db, queue);
  const observability = new WorkerObservabilityServer(db, connection, queue, new MetricsRegistry());
  let observabilityPort: number;

  beforeAll(async () => {
    await worker.waitUntilReady();
    observabilityPort = await observability.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await observability.close();
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
    const deletionRequests = await db.accountDeletionRequest.findMany({
      where: { subjectRef: { startsWith: runId } },
      select: { id: true },
    });
    await db.auditLog.deleteMany({
      where: {
        entity: 'AccountDeletionRequest',
        entityId: { in: deletionRequests.map(({ id }) => id) },
      },
    });
    await db.accountDeletionRequest.deleteMany({ where: { subjectRef: { startsWith: runId } } });
    await db.deletionTombstone.deleteMany({ where: { subjectRef: { startsWith: runId } } });
    await db.user.deleteMany({ where: { email: { startsWith: `deleted-${runId}` } } });
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

  it('reports real PostgreSQL and Redis readiness', async () => {
    const readiness = await fetch(`http://127.0.0.1:${observabilityPort}/ready`);
    expect(readiness.status).toBe(200);
    await expect(readiness.json()).resolves.toEqual({ status: 'ok', service: 'worker' });

    const metrics = await fetch(`http://127.0.0.1:${observabilityPort}/metrics`);
    expect(metrics.status).toBe(200);
    expect(await metrics.text()).toContain('matiq_worker_queue_jobs');
  });

  it('delivers one encrypted email event through the real queue', async () => {
    const recipient = `worker-${runId}@example.de`;
    const event = await db.outboxEvent.create({
      data: {
        topic: 'email.send.v1',
        payload: encryptTransactionalEmail(
          createTransactionalEmail('VERIFY_EMAIL', recipient, 'secret-token'),
        ),
        idempotencyKey: `${runId}:email`,
      },
    });
    await dispatcher.dispatchBatch();
    await waitFor(
      async () =>
        (await db.inboxJob.findUnique({ where: { outboxEventId: event.id } }))?.status ===
        'COMPLETED',
    );
    expect(deliveredEmails).toEqual([recipient]);
  });

  it('dead-letters a damaged email envelope without calling the provider', async () => {
    const event = await db.outboxEvent.create({
      data: {
        topic: 'email.send.v1',
        payload: { version: 1, iv: 'invalid', ciphertext: 'invalid', authTag: 'invalid' },
        idempotencyKey: `${runId}:damaged-email`,
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
    expect(deliveredEmails).toHaveLength(1);
    await expect(
      db.deadLetterJob.findFirstOrThrow({ where: { inboxJob: { outboxEventId: event.id } } }),
    ).resolves.toMatchObject({ error: 'INVALID_EMAIL_ENVELOPE' });
  });

  it('orchestrates product-data deletion and unlinks the retained receipt', async () => {
    const user = await db.user.create({
      data: {
        email: `deleted-${runId}@deleted.invalid`,
        passwordHash: 'irreversible-placeholder',
        deletedAt: new Date(),
        deletionRequestedAt: new Date(),
        athleteProfile: {
          create: {
            disciplines: ['BJJ_GI'],
            experienceYears: 1,
            trainingSessionsPerWeek: 2,
            competitionExperience: false,
            goals: ['GENERAL_DEVELOPMENT'],
          },
        },
      },
    });
    const deletionRequest = await db.accountDeletionRequest.create({
      data: {
        userId: user.id,
        subjectRef: `${runId}-subject`,
        retainUntil: new Date('2030-01-01T00:00:00.000Z'),
      },
    });
    const event = await db.outboxEvent.create({
      data: {
        topic: 'privacy.account-delete.v1',
        payload: { requestId: deletionRequest.id, userId: user.id },
        idempotencyKey: `${runId}:privacy`,
      },
    });

    await dispatcher.dispatchBatch();
    await waitFor(
      async () =>
        (await db.inboxJob.findUnique({ where: { outboxEventId: event.id } }))?.status ===
        'COMPLETED',
    );

    await expect(db.athleteProfile.findUnique({ where: { userId: user.id } })).resolves.toBeNull();
    await expect(
      db.accountDeletionRequest.findUniqueOrThrow({ where: { id: deletionRequest.id } }),
    ).resolves.toMatchObject({ userId: null, completedAt: expect.any(Date) });
  });

  it('reapplies deletion tombstones after a database restore', async () => {
    const subjectRef = `${runId}-restored-subject`;
    const requestedAt = new Date('2026-08-01T00:00:00.000Z');
    const retainUntil = new Date('2030-01-01T00:00:00.000Z');
    await db.deletionTombstone.create({ data: { subjectRef, requestedAt, retainUntil } });
    const snapshot = await exportDeletionLedger(db, new Date('2026-09-01T00:00:00.000Z'));

    await db.deletionTombstone.delete({ where: { subjectRef } });
    const restoredUser = await db.user.create({
      data: {
        email: `restored-${runId}@example.de`,
        passwordHash: 'restored-secret-hash',
        privacySubjectId: subjectRef,
        athleteProfile: {
          create: {
            disciplines: ['BJJ_GI'],
            experienceYears: 2,
            trainingSessionsPerWeek: 3,
            competitionExperience: false,
            goals: ['GENERAL_DEVELOPMENT'],
          },
        },
      },
    });

    await expect(
      reapplyDeletionLedger(db, snapshot, new Date('2026-09-02T00:00:00.000Z')),
    ).resolves.toEqual({ reapplied: 1 });
    await expect(
      db.athleteProfile.findUnique({ where: { userId: restoredUser.id } }),
    ).resolves.toBeNull();
    await expect(
      db.user.findUniqueOrThrow({ where: { id: restoredUser.id } }),
    ).resolves.toMatchObject({
      email: `deleted-${subjectRef}@deleted.invalid`,
      deletedAt: expect.any(Date),
    });
    await expect(
      db.accountDeletionRequest.findUnique({ where: { subjectRef } }),
    ).resolves.toMatchObject({ userId: null, completedAt: expect.any(Date) });
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
