import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { eraseAccountAuditIdentifiers, eraseLocalAccountData } from './privacy.js';

export type DeletionLedgerSnapshot = {
  version: 1;
  exportedAt: string;
  tombstones: Array<{ subjectRef: string; requestedAt: string; retainUntil: string }>;
};

export async function exportDeletionLedger(
  db: PrismaClient,
  now = new Date(),
): Promise<DeletionLedgerSnapshot> {
  const tombstones = await db.deletionTombstone.findMany({
    where: { retainUntil: { gt: now } },
    select: { subjectRef: true, requestedAt: true, retainUntil: true },
    orderBy: { requestedAt: 'asc' },
  });
  return {
    version: 1,
    exportedAt: now.toISOString(),
    tombstones: tombstones.map((item) => ({
      subjectRef: item.subjectRef,
      requestedAt: item.requestedAt.toISOString(),
      retainUntil: item.retainUntil.toISOString(),
    })),
  };
}

export function parseDeletionLedger(value: unknown): DeletionLedgerSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_LEDGER');
  const candidate = value as Partial<DeletionLedgerSnapshot>;
  if (candidate.version !== 1 || !candidate.exportedAt || !Array.isArray(candidate.tombstones)) {
    throw new Error('INVALID_LEDGER');
  }
  const exportedAt = new Date(candidate.exportedAt);
  if (Number.isNaN(exportedAt.getTime())) throw new Error('INVALID_LEDGER');
  for (const item of candidate.tombstones) {
    if (
      !item ||
      typeof item.subjectRef !== 'string' ||
      !item.subjectRef ||
      Number.isNaN(new Date(item.requestedAt).getTime()) ||
      Number.isNaN(new Date(item.retainUntil).getTime())
    ) {
      throw new Error('INVALID_LEDGER');
    }
  }
  return candidate as DeletionLedgerSnapshot;
}

export async function reapplyDeletionLedger(
  db: PrismaClient,
  snapshot: DeletionLedgerSnapshot,
  now = new Date(),
) {
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
      const receipt = await tx.accountDeletionRequest.findUnique({
        where: { subjectRef: item.subjectRef },
        select: { completedAt: true },
      });
      const completedAt = receipt?.completedAt ?? now;
      // Receipt retention is separate from the rolling backup/tombstone window.
      const receiptRetainUntil = new Date(Date.UTC(completedAt.getUTCFullYear() + 4, 0, 1));
      await eraseLocalAccountData(tx, user.id);
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
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
      await tx.accountDeletionRequest.upsert({
        where: { subjectRef: item.subjectRef },
        create: {
          subjectRef: item.subjectRef,
          requestedAt,
          completedAt,
          retainUntil: receiptRetainUntil,
        },
        update: { userId: null, completedAt, retainUntil: receiptRetainUntil },
      });
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
  return { reapplied };
}
