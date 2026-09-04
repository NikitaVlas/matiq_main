import { randomBytes, randomUUID } from 'node:crypto';
import { PostgresRenewalStore, type RenewalSqlClient } from '../billing/postgres-renewal-store.js';

export interface DeletionScheduleDatabase extends RenewalSqlClient {
  $transaction<T>(fn: (tx: RenewalSqlClient) => Promise<T>): Promise<T>;
}

export type DeletionScheduleStatus = {
  scheduled: boolean;
  executeAt: string | null;
  renewalConfirmed: boolean;
};

export class PostgresDeletionSchedule {
  constructor(private readonly db: DeletionScheduleDatabase) {}

  async status(userId: string): Promise<DeletionScheduleStatus> {
    const rows = await this.db.$queryRaw<{ executeAt: Date; renewalConfirmed: boolean }[]>`
      SELECT d."executeAt", NOT EXISTS (
        SELECT 1 FROM "RenewalCancellationOperation" o
        WHERE o."id" LIKE d."id" || ':%' AND o."status" <> 'CONFIRMED'
      ) AS "renewalConfirmed" FROM "AccountDeletionSchedule" d WHERE d."userId" = ${userId}`;
    const row = rows[0];
    return row
      ? {
          scheduled: true,
          executeAt: row.executeAt.toISOString(),
          renewalConfirmed: row.renewalConfirmed,
        }
      : { scheduled: false, executeAt: null, renewalConfirmed: false };
  }

  async request(userId: string): Promise<DeletionScheduleStatus> {
    await this.db.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User"
        WHERE "id" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!users.length) throw new Error('ACCOUNT_UNAVAILABLE');
      const existing = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "AccountDeletionSchedule" WHERE "userId" = ${userId}`;
      if (existing.length) return;
      const id = randomUUID();
      await tx.$executeRaw`INSERT INTO "AccountDeletionSchedule" ("id", "userId", "executeAt")
        SELECT ${id}, ${userId}, GREATEST(CURRENT_TIMESTAMP,
          COALESCE(MAX("endsAt") FILTER (WHERE "status" IN ('ACTIVE', 'CANCEL_AT_PERIOD_END')), CURRENT_TIMESTAMP))
        FROM "Subscription" WHERE "userId" = ${userId}`;
      const subscriptions = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Subscription"
        WHERE "userId" = ${userId} AND "providerSubscriptionId" IS NOT NULL`;
      const operations = new PostgresRenewalStore(tx);
      for (const subscription of subscriptions)
        await operations.request(`${id}:${subscription.id}`, subscription.id, userId);
      await tx.$executeRaw`INSERT INTO "AuditLog" ("id", "action", "entity", "entityId", "actor")
        VALUES (${randomUUID()}, 'ACCOUNT_DELETE_SCHEDULED', 'User', ${userId}, ${userId})`;
    });
    return this.status(userId);
  }

  async cancel(userId: string): Promise<DeletionScheduleStatus> {
    await this.db.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User"
        WHERE "id" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`;
      if (!users.length) throw new Error('DELETION_CANNOT_BE_CANCELED');
      const schedules = await tx.$queryRaw<
        { executeAt: Date }[]
      >`SELECT "executeAt" FROM "AccountDeletionSchedule" WHERE "userId" = ${userId}`;
      if (!schedules.length) return;
      const removed = await tx.$executeRaw`DELETE FROM "AccountDeletionSchedule"
        WHERE "userId" = ${userId} AND "executeAt" > clock_timestamp()`;
      if (!removed) throw new Error('DELETION_CANNOT_BE_CANCELED');
      await tx.$executeRaw`INSERT INTO "AuditLog" ("id", "action", "entity", "entityId", "actor")
        VALUES (${randomUUID()}, 'ACCOUNT_DELETE_SCHEDULE_CANCELED', 'User', ${userId}, ${userId})`;
    });
    // Renewal operations remain: canceling deletion never enables renewal.
    return this.status(userId);
  }

  async processDue(): Promise<number> {
    const due = await this.db.$queryRaw<
      { userId: string }[]
    >`SELECT "userId" FROM "AccountDeletionSchedule"
      WHERE "executeAt" <= CURRENT_TIMESTAMP ORDER BY "executeAt" LIMIT 25`;
    let started = 0;
    for (const { userId } of due) {
      started += await this.db.$transaction(async (tx) => {
        const users = await tx.$queryRaw<{ privacySubjectId: string; deletedAt: Date | null }[]>`
          SELECT "privacySubjectId", "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const user = users[0];
        if (!user || user.deletedAt) {
          await tx.$executeRaw`DELETE FROM "AccountDeletionSchedule" WHERE "userId" = ${userId}`;
          return 0;
        }
        const claimed = await tx.$executeRaw`DELETE FROM "AccountDeletionSchedule"
          WHERE "userId" = ${userId} AND "executeAt" <= CURRENT_TIMESTAMP`;
        if (!claimed) return 0;
        const requestId = randomUUID();
        const subjectRef = user.privacySubjectId;
        await tx.$executeRaw`INSERT INTO "AccountDeletionRequest" ("id", "userId", "subjectRef", "retainUntil")
          VALUES (${requestId}, ${userId}, ${subjectRef}, date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '4 years')`;
        await tx.$executeRaw`INSERT INTO "DeletionTombstone" ("id", "subjectRef", "requestedAt", "retainUntil")
          VALUES (${randomUUID()}, ${subjectRef}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '35 days')
          ON CONFLICT ("subjectRef") DO UPDATE SET "retainUntil" = EXCLUDED."retainUntil"`;
        await tx.$executeRaw`DELETE FROM "Session" WHERE "userId" = ${userId}`;
        await tx.$executeRaw`DELETE FROM "EmailVerificationToken" WHERE "userId" = ${userId}`;
        await tx.$executeRaw`DELETE FROM "PasswordResetToken" WHERE "userId" = ${userId}`;
        await tx.$executeRaw`DELETE FROM "MfaRecoveryCode" WHERE "userId" = ${userId}`;
        await tx.$executeRaw`UPDATE "User" SET "email" = ${`deleted-${subjectRef}@deleted.invalid`},
          "passwordHash" = ${randomBytes(32).toString('hex')}, "role" = 'ATHLETE', "emailVerifiedAt" = NULL,
          "mfaSecretEncrypted" = NULL, "mfaEnabledAt" = NULL, "deletedAt" = CURRENT_TIMESTAMP,
          "deletionRequestedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${userId}`;
        await tx.$executeRaw`INSERT INTO "OutboxEvent" ("id", "topic", "payload", "idempotencyKey", "updatedAt")
          VALUES (${randomUUID()}, 'privacy.account-delete.v1',
          ${JSON.stringify({ requestId, userId })}::jsonb, ${`privacy.account-delete.v1:${requestId}`}, CURRENT_TIMESTAMP)`;
        await tx.$executeRaw`INSERT INTO "AuditLog" ("id", "action", "entity", "entityId", "actor")
          VALUES (${randomUUID()}, 'ACCOUNT_DELETE_REQUESTED', 'AccountDeletionRequest', ${requestId}, ${`subject:${subjectRef}`})`;
        return 1;
      });
    }
    return started;
  }
}
