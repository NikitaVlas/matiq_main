import { randomBytes, randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { PostgresDeletionSchedule, PostgresRenewalStore } from '@matiq/backend';
import { eraseAccountAuditIdentifiers, eraseLocalAccountData } from './privacy.js';

type TombstoneEntry = {
  subjectRef: string;
  requestedAt: string;
  retainUntil: string;
  completedAt?: string | null;
};
type ScheduleEntry = { subjectRef: string; executeAt: string; createdAt: string };

export type DeletionLedgerSnapshot = {
  version: 1 | 2;
  exportedAt: string;
  tombstones: TombstoneEntry[];
  schedules?: ScheduleEntry[];
};

export async function exportDeletionLedger(
  db: PrismaClient,
  now = new Date(),
): Promise<DeletionLedgerSnapshot> {
  const [tombstones, schedules] = await db.$transaction([
    db.$queryRaw<
      { subjectRef: string; requestedAt: Date; retainUntil: Date; completedAt: Date | null }[]
    >`SELECT t."subjectRef", t."requestedAt", t."retainUntil", r."completedAt"
      FROM "DeletionTombstone" t LEFT JOIN "AccountDeletionRequest" r
        ON r."subjectRef" = t."subjectRef"
      WHERE t."retainUntil" > ${now} ORDER BY t."requestedAt"`,
    db.$queryRaw<{ subjectRef: string; executeAt: Date; createdAt: Date }[]>`
      SELECT u."privacySubjectId" AS "subjectRef", d."executeAt", d."createdAt"
      FROM "AccountDeletionSchedule" d
      JOIN "User" u ON u."id" = d."userId"
      WHERE u."deletedAt" IS NULL ORDER BY d."createdAt"`,
  ]);
  return {
    version: 2,
    exportedAt: now.toISOString(),
    tombstones: tombstones.map((item) => ({
      subjectRef: item.subjectRef,
      requestedAt: item.requestedAt.toISOString(),
      retainUntil: item.retainUntil.toISOString(),
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
    schedules: schedules.map((item) => ({
      subjectRef: item.subjectRef,
      executeAt: item.executeAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export function parseDeletionLedger(value: unknown): DeletionLedgerSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_LEDGER');
  const candidate = value as Partial<DeletionLedgerSnapshot>;
  if (
    (candidate.version !== 1 && candidate.version !== 2) ||
    typeof candidate.exportedAt !== 'string' ||
    !candidate.exportedAt ||
    !Array.isArray(candidate.tombstones) ||
    (candidate.version === 2 && !Array.isArray(candidate.schedules)) ||
    (candidate.schedules !== undefined && !Array.isArray(candidate.schedules))
  ) {
    throw new Error('INVALID_LEDGER');
  }
  const exportedAt = new Date(candidate.exportedAt);
  if (Number.isNaN(exportedAt.getTime())) throw new Error('INVALID_LEDGER');
  const date = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
  const subjects = new Set<string>();
  for (const item of candidate.tombstones) {
    if (
      !item ||
      typeof item.subjectRef !== 'string' ||
      !item.subjectRef ||
      item.subjectRef.length > 200 ||
      subjects.has(item.subjectRef) ||
      !date(item.requestedAt) ||
      !date(item.retainUntil) ||
      Date.parse(item.retainUntil) <= Date.parse(item.requestedAt) ||
      (candidate.version === 2 &&
        (!Object.hasOwn(item, 'completedAt') ||
          (item.completedAt !== null &&
            (typeof item.completedAt !== 'string' ||
              Number.isNaN(new Date(item.completedAt).getTime())))))
    ) {
      throw new Error('INVALID_LEDGER');
    }
    subjects.add(item.subjectRef);
  }
  for (const item of candidate.schedules ?? []) {
    if (
      !item ||
      typeof item.subjectRef !== 'string' ||
      !item.subjectRef ||
      item.subjectRef.length > 200 ||
      subjects.has(item.subjectRef) ||
      !date(item.executeAt) ||
      !date(item.createdAt)
    ) {
      throw new Error('INVALID_LEDGER');
    }
    subjects.add(item.subjectRef);
  }
  return candidate as DeletionLedgerSnapshot;
}

export async function reapplyDeletionLedger(
  db: PrismaClient,
  snapshot: DeletionLedgerSnapshot,
  now = new Date(),
) {
  parseDeletionLedger(snapshot);
  let reapplied = 0;
  for (const item of snapshot.tombstones) {
    const requestedAt = new Date(item.requestedAt);
    const retainUntil = new Date(item.retainUntil);
    if (retainUntil <= now) continue;
    await db.deletionTombstone.upsert({
      where: { subjectRef: item.subjectRef },
      create: { subjectRef: item.subjectRef, requestedAt, retainUntil },
      update: { requestedAt, retainUntil },
    });
    const user = await db.user.findUnique({ where: { privacySubjectId: item.subjectRef } });
    if (!user) continue;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      const receipt = await tx.accountDeletionRequest.findUnique({
        where: { subjectRef: item.subjectRef },
        select: { completedAt: true },
      });
      const linkedSubscriptions = await tx.subscription.count({
        where: {
          userId: user.id,
          OR: [{ providerCustomerId: { not: null } }, { providerSubscriptionId: { not: null } }],
        },
      });
      const recordedCompletion =
        snapshot.version === 2
          ? item.completedAt
            ? new Date(item.completedAt)
            : (receipt?.completedAt ?? null)
          : (receipt?.completedAt ?? null);
      const completedAt = linkedSubscriptions ? null : recordedCompletion;
      // Receipt retention is separate from the rolling backup/tombstone window.
      const retentionAnchor = completedAt ?? now;
      const receiptRetainUntil = new Date(Date.UTC(retentionAnchor.getUTCFullYear() + 4, 0, 1));
      await eraseLocalAccountData(tx, user.id);
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
      await new PostgresRenewalStore(tx).requestDeletion(user.id, `restore:${snapshot.exportedAt}`);
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `deleted-${item.subjectRef}@deleted.invalid`,
          passwordHash: randomBytes(32).toString('hex'),
          role: 'ATHLETE',
          emailVerifiedAt: null,
          mfaSecretEncrypted: null,
          mfaEnabledAt: null,
          deletionRequestedAt: requestedAt,
          deletedAt: now,
        },
      });
      const deletionRequest = await tx.accountDeletionRequest.upsert({
        where: { subjectRef: item.subjectRef },
        create: {
          subjectRef: item.subjectRef,
          requestedAt,
          completedAt,
          retainUntil: receiptRetainUntil,
          userId: completedAt ? null : user.id,
        },
        update: {
          userId: completedAt ? null : user.id,
          completedAt,
          retainUntil: receiptRetainUntil,
        },
      });
      if (!completedAt)
        await new PostgresRenewalStore(tx).requestDeletion(
          user.id,
          `deletion:${deletionRequest.id}`,
        );
      if (!completedAt) {
        const payload = JSON.stringify({ requestId: deletionRequest.id, userId: user.id });
        await tx.$executeRaw`INSERT INTO "OutboxEvent"
          ("id", "topic", "payload", "idempotencyKey", "updatedAt")
          VALUES (${randomUUID()}, 'privacy.account-delete.v1', ${payload}::jsonb,
            ${`privacy.account-delete.v1:restore:${item.subjectRef}`}, CURRENT_TIMESTAMP)
          ON CONFLICT ("idempotencyKey") DO UPDATE SET "payload" = EXCLUDED."payload",
            "status" = 'PENDING', "availableAt" = CURRENT_TIMESTAMP, "publishedAt" = NULL,
            "publishAttempts" = 0, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP`;
        // Restore runs with workers stopped and a rebuilt queue. A stale inbox
        // must not suppress work for a receipt that is still incomplete.
        await tx.$executeRaw`DELETE FROM "DeadLetterJob" d USING "InboxJob" i, "OutboxEvent" o
          WHERE d."inboxJobId" = i."id" AND i."outboxEventId" = o."id"
          AND o."idempotencyKey" = ${`privacy.account-delete.v1:restore:${item.subjectRef}`}`;
        await tx.$executeRaw`UPDATE "InboxJob" i SET "status" = 'FAILED', "attempts" = 0,
          "completedAt" = NULL, "startedAt" = NULL, "lastError" = NULL, "updatedAt" = CURRENT_TIMESTAMP
          FROM "OutboxEvent" o WHERE i."outboxEventId" = o."id"
          AND o."idempotencyKey" = ${`privacy.account-delete.v1:restore:${item.subjectRef}`}`;
      }
      await eraseAccountAuditIdentifiers(tx, user.id, item.subjectRef);
      await tx.auditLog.create({
        data: {
          actor: 'system:restore-guard',
          action: 'ACCOUNT_DELETE_REAPPLIED',
          entity: 'AccountDeletionRequest',
          metadata: { subjectRef: item.subjectRef },
        },
      });
    });
    reapplied += 1;
  }
  if (snapshot.version === 2) await reconcileDeletionSchedules(db, snapshot);
  return { reapplied };
}

async function reconcileDeletionSchedules(db: PrismaClient, snapshot: DeletionLedgerSnapshot) {
  const exportedAt = new Date(snapshot.exportedAt);
  const expectedSubjects = new Set((snapshot.schedules ?? []).map(({ subjectRef }) => subjectRef));
  const restoredSchedules = await db.$queryRaw<{ userId: string; subjectRef: string }[]>`
    SELECT d."userId", u."privacySubjectId" AS "subjectRef"
    FROM "AccountDeletionSchedule" d JOIN "User" u ON u."id" = d."userId"
    WHERE d."createdAt" <= ${exportedAt}`;

  // A v2 export is authoritative for schedules that existed by export time.
  // Absence therefore records a cancellation made after the restored backup.
  for (const schedule of restoredSchedules) {
    if (!expectedSubjects.has(schedule.subjectRef)) {
      await db.$executeRaw`DELETE FROM "AccountDeletionSchedule" WHERE "userId" = ${schedule.userId}`;
    }
  }

  for (const item of snapshot.schedules ?? []) {
    const user = await db.user.findUnique({
      where: { privacySubjectId: item.subjectRef },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) continue;
    await new PostgresDeletionSchedule(db).request(user.id);
    await db.$executeRaw`UPDATE "AccountDeletionSchedule"
      SET "executeAt" = ${new Date(item.executeAt)}, "createdAt" = ${new Date(item.createdAt)}
      WHERE "userId" = ${user.id}`;
  }
}
