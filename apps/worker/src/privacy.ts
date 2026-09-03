import { Prisma, type PrismaClient } from '@prisma/client';
import type { EventHandler } from './types.js';

type AccountDeletionPayload = { requestId: string; userId: string };

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
      where: { userId: payload.userId, providerCustomerId: { not: null } },
      select: { providerCustomerId: true },
    });
    const providerCustomerIds = [
      ...new Set(
        subscriptions.flatMap(({ providerCustomerId }) =>
          providerCustomerId ? [providerCustomerId] : [],
        ),
      ),
    ];

    await db.$transaction(async (tx) => {
      await eraseLocalAccountData(tx, payload.userId);
    });

    for (const processor of processors) {
      await processor.eraseAccount({ subjectRef: request.subjectRef, providerCustomerIds });
    }

    const completedAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actor: 'system:retention-worker',
          action: 'ACCOUNT_DELETE_COMPLETED',
          entity: 'AccountDeletionRequest',
          entityId: request.id,
          metadata: { processors: processors.map(({ name }) => name) },
        },
      });
      await tx.accountDeletionRequest.updateMany({
        where: { id: request.id, userId: payload.userId, completedAt: null },
        data: { userId: null, completedAt },
      });
      await tx.auditLog.updateMany({
        where: { OR: [{ actor: payload.userId }, { entityId: payload.userId }] },
        data: { actor: `subject:${request.subjectRef}`, entityId: null },
      });
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
