import { PrismaClient } from '@prisma/client';
import { PostgresPrivacyOperationsMonitor } from '@matiq/backend';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Privacy operations integration tests require a disposable matiq_test database.');
}

describe('privacy operations PostgreSQL workflow', () => {
  const db = new PrismaClient();
  const monitor = new PostgresPrivacyOperationsMonitor(db);
  const suffix = `${Date.now()}`;
  const actor = `privacy-ops-admin-${suffix}`;
  let originalOutboxId = '';
  let deadLetterId = '';

  beforeAll(async () => {
    const outbox = await db.outboxEvent.create({
      data: {
        topic: 'privacy.account-delete.v1',
        payload: { requestId: `request-${suffix}`, userId: `user-${suffix}` },
        idempotencyKey: `privacy-ops-original-${suffix}`,
        status: 'PUBLISHED',
      },
    });
    originalOutboxId = outbox.id;
    const inbox = await db.inboxJob.create({
      data: {
        outboxEventId: outbox.id,
        topic: outbox.topic,
        status: 'DEAD_LETTER',
        attempts: 5,
      },
    });
    const deadLetter = await db.deadLetterJob.create({
      data: { inboxJobId: inbox.id, topic: outbox.topic, error: 'synthetic-safe-error' },
    });
    deadLetterId = deadLetter.id;
  });

  afterAll(async () => {
    await db.outboxEvent.deleteMany({
      where: { idempotencyKey: `privacy-retry:${deadLetterId}` },
    });
    await db.deadLetterJob.deleteMany({ where: { id: deadLetterId } });
    await db.inboxJob.deleteMany({ where: { outboxEventId: originalOutboxId } });
    await db.outboxEvent.deleteMany({ where: { id: originalOutboxId } });
    await db.auditLog.deleteMany({
      where: { actor, action: 'PRIVACY_OPERATIONS_RETRY_REQUESTED' },
    });
    await db.$disconnect();
  });

  it('reports aggregate state and requeues a dead letter only once', async () => {
    const before = await monitor.snapshot();
    expect(before.privacyDeadLetters).toBeGreaterThanOrEqual(1);

    await expect(monitor.retry(actor)).resolves.toMatchObject({ deadLettersRequeued: 1 });
    await expect(monitor.retry(actor)).resolves.toMatchObject({ deadLettersRequeued: 0 });
    await expect(
      db.outboxEvent.count({ where: { idempotencyKey: `privacy-retry:${deadLetterId}` } }),
    ).resolves.toBe(1);
  });
});
