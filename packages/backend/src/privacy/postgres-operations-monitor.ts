import { randomUUID } from 'node:crypto';
import type { RenewalSqlClient } from '../billing/postgres-renewal-store.js';

export type PrivacyOperationsSnapshot = {
  scheduled: number;
  dueSchedules: number;
  pendingDeletion: number;
  pendingOutbox: number;
  staleProcessing: number;
  failedInbox: number;
  privacyDeadLetters: number;
  renewalPending: number;
  renewalReviewRequired: number;
  oldestPendingSeconds: number;
};

export interface PrivacyOperationsDatabase extends RenewalSqlClient {
  $transaction<T>(fn: (tx: RenewalSqlClient) => Promise<T>): Promise<T>;
}

export class PostgresPrivacyOperationsMonitor {
  constructor(private readonly db: PrivacyOperationsDatabase) {}

  async snapshot(): Promise<PrivacyOperationsSnapshot> {
    const rows = await this.db.$queryRaw<PrivacyOperationsSnapshot[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "AccountDeletionSchedule") AS "scheduled",
        (SELECT COUNT(*)::int FROM "AccountDeletionSchedule"
          WHERE "executeAt" <= CURRENT_TIMESTAMP) AS "dueSchedules",
        (SELECT COUNT(*)::int FROM "AccountDeletionRequest"
          WHERE "completedAt" IS NULL) AS "pendingDeletion",
        (SELECT COUNT(*)::int FROM "OutboxEvent"
          WHERE "topic" = 'privacy.account-delete.v1' AND "status" = 'PENDING') AS "pendingOutbox",
        (SELECT COUNT(*)::int FROM "InboxJob"
          WHERE "topic" = 'privacy.account-delete.v1' AND "status" = 'PROCESSING'
            AND "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '5 minutes') AS "staleProcessing",
        (SELECT COUNT(*)::int FROM "InboxJob"
          WHERE "topic" = 'privacy.account-delete.v1' AND "status" = 'FAILED') AS "failedInbox",
        (SELECT COUNT(*)::int FROM "DeadLetterJob"
          WHERE "topic" = 'privacy.account-delete.v1') AS "privacyDeadLetters",
        (SELECT COUNT(*)::int FROM "RenewalCancellationOperation"
          WHERE "status" <> 'CONFIRMED' AND "attempts" < 12) AS "renewalPending",
        (SELECT COUNT(*)::int FROM "RenewalCancellationOperation"
          WHERE "status" <> 'CONFIRMED' AND "attempts" >= 12) AS "renewalReviewRequired",
        COALESCE((SELECT FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MIN("createdAt"))))::int
          FROM "OutboxEvent" WHERE "topic" = 'privacy.account-delete.v1'
            AND "status" = 'PENDING'), 0) AS "oldestPendingSeconds"`;
    const row = rows[0];
    if (!row) throw new Error('PRIVACY_OPERATIONS_STATUS_UNAVAILABLE');
    return row;
  }

  async retry(actorId: string) {
    return this.db.$transaction(async (tx) => {
      const pendingReleased = await tx.$executeRaw`UPDATE "OutboxEvent"
        SET "availableAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "topic" = 'privacy.account-delete.v1' AND "status" = 'PENDING'
          AND "availableAt" > CURRENT_TIMESTAMP`;
      const deadLetters = await tx.$queryRaw<
        { id: string; payload: unknown }[]
      >`SELECT d."id", o."payload" FROM "DeadLetterJob" d
        JOIN "InboxJob" i ON i."id" = d."inboxJobId"
        JOIN "OutboxEvent" o ON o."id" = i."outboxEventId"
        WHERE d."topic" = 'privacy.account-delete.v1'
          AND NOT EXISTS (SELECT 1 FROM "OutboxEvent" retry
            WHERE retry."idempotencyKey" = 'privacy-retry:' || d."id")
        ORDER BY d."createdAt" LIMIT 25`;
      let deadLettersRequeued = 0;
      for (const row of deadLetters) {
        const payload = JSON.stringify(row.payload);
        deadLettersRequeued += await tx.$executeRaw`INSERT INTO "OutboxEvent"
          ("id", "topic", "payload", "idempotencyKey", "updatedAt")
          VALUES (${randomUUID()}, 'privacy.account-delete.v1', ${payload}::jsonb,
            ${`privacy-retry:${row.id}`}, CURRENT_TIMESTAMP)
          ON CONFLICT ("idempotencyKey") DO NOTHING`;
      }
      await tx.$executeRaw`INSERT INTO "AuditLog"
        ("id", "action", "entity", "actor", "metadata")
        VALUES (${randomUUID()}, 'PRIVACY_OPERATIONS_RETRY_REQUESTED',
          'PrivacyOperations', ${actorId},
          ${JSON.stringify({ pendingReleased, deadLettersRequeued })}::jsonb)`;
      return { pendingReleased, deadLettersRequeued };
    });
  }
}
