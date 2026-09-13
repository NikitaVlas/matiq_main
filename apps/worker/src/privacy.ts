import { Prisma, type PrismaClient } from '@prisma/client';
import type { EventHandler } from './types.js';
import { PostgresRenewalStore } from '@matiq/backend';

type AccountDeletionPayload = { requestId: string; userId: string };

export async function eraseAccountAuditIdentifiers(
  tx: Prisma.TransactionClient,
  userId: string,
  subjectRef: string,
) {
  await tx.auditLog.updateMany({
    where: { OR: [{ actor: userId }, { entityId: userId }, { actor: `subject:${subjectRef}` }] },
    // Keep the minimum event, never arbitrary JSON that can contain nested identifiers.
    data: { actor: `subject:${subjectRef}`, entityId: null, metadata: Prisma.DbNull },
  });
}

export async function eraseLocalAccountData(tx: Prisma.TransactionClient, userId: string) {
  await tx.verifiedWatchInterval.deleteMany({ where: { userId } });
  await tx.playbackSession.deleteMany({ where: { userId } });
  await tx.videoWatch.deleteMany({ where: { userId } });
  await tx.assessmentAttempt.deleteMany({ where: { userId } });
  await tx.assessment.deleteMany({ where: { userId } });
  await tx.athleteProfile.deleteMany({ where: { userId } });
  await tx.trainerProfile.deleteMany({ where: { userId } });
  await tx.course.updateMany({ where: { trainerId: userId }, data: { trainerId: null } });
  await tx.video.updateMany({ where: { trainerId: userId }, data: { trainerId: null } });
}

export type ExternalDeletionProcessor = {
  name: string;
  eraseAccount(request: {
    subjectRef: string;
    providerCustomerIds: readonly string[];
  }): Promise<void>;
};

export function createAccountDeletionHandler(
  db: PrismaClient,
  processors: readonly ExternalDeletionProcessor[] = [],
): EventHandler {
  return async (rawPayload) => {
    const payload = accountDeletionPayload(rawPayload);
    const request = await db.accountDeletionRequest.findUnique({
      where: { id: payload.requestId },
    });
    if (!request || request.completedAt) return;
    if (request.userId !== payload.userId) throw new Error('ACCOUNT_DELETION_SUBJECT_MISMATCH');
    const subscriptions = await db.subscription.findMany({
      where: {
        userId: payload.userId,
        OR: [{ providerCustomerId: { not: null } }, { providerSubscriptionId: { not: null } }],
      },
      select: { providerCustomerId: true, providerSubscriptionId: true },
    });
    const providerCustomerIds = [
      ...new Set(
        subscriptions.flatMap(({ providerCustomerId }) =>
          providerCustomerId ? [providerCustomerId] : [],
        ),
      ),
    ];

    await db.$transaction(async (tx) => {
      const users = await tx.$queryRaw<{ deletedAt: Date | null }[]>`
        SELECT "deletedAt" FROM "User" WHERE "id" = ${payload.userId} FOR UPDATE`;
      if (!users[0]?.deletedAt) throw new Error('ACCOUNT_DELETION_NOT_STARTED');
      await eraseLocalAccountData(tx, payload.userId);
      await eraseAccountAuditIdentifiers(tx, payload.userId, request.subjectRef);
      await new PostgresRenewalStore(tx).requestDeletion(payload.userId, `deletion:${request.id}`);
    });

    if (await new PostgresRenewalStore(db).deletionRenewalPending(payload.userId))
      throw new Error('RENEWAL_RECONCILIATION_PENDING');

    if (subscriptions.length && processors.length === 0) {
      throw new Error('EXTERNAL_DELETION_CONFIRMATION_REQUIRED');
    }

    for (const processor of processors) {
      try {
        await processor.eraseAccount({ subjectRef: request.subjectRef, providerCustomerIds });
      } catch {
        throw new Error('EXTERNAL_DELETION_CONFIRMATION_REQUIRED');
      }
    }

    // Provider-link retention and late-webhook matching require the separate
    // approved provider design. Do not claim complete erasure while links remain.
    if (subscriptions.length) throw new Error('PROVIDER_LINK_RETENTION_REVIEW_REQUIRED');

    const completedAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${payload.userId} FOR UPDATE`;
      if (
        await tx.subscription.count({
          where: {
            userId: payload.userId,
            OR: [{ providerCustomerId: { not: null } }, { providerSubscriptionId: { not: null } }],
          },
        })
      )
        throw new Error('EXTERNAL_DELETION_CONFIRMATION_REQUIRED');
      const completed = await tx.accountDeletionRequest.updateMany({
        where: { id: request.id, userId: payload.userId, completedAt: null },
        data: { userId: null, completedAt },
      });
      if (!completed.count) return;
      await tx.auditLog.create({
        data: {
          actor: 'system:retention-worker',
          action: 'ACCOUNT_DELETE_COMPLETED',
          entity: 'AccountDeletionRequest',
          entityId: request.id,
          metadata: { processors: processors.map(({ name }) => name) },
        },
      });
      await eraseAccountAuditIdentifiers(tx, payload.userId, request.subjectRef);
    });
  };
}

function accountDeletionPayload(value: Prisma.JsonValue): AccountDeletionPayload {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    typeof value.requestId !== 'string' ||
    typeof value.userId !== 'string'
  ) {
    throw new Error('INVALID_ACCOUNT_DELETION_PAYLOAD');
  }
  return { requestId: value.requestId, userId: value.userId };
}
