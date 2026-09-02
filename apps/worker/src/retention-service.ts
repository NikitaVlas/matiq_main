import type { PrismaClient } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1_000;

export const RETENTION_DAYS = {
  authTokenGrace: 7,
  sessionGrace: 1,
  playback: 90,
  verifiedViewing: 180,
  processedPayload: 1,
  messagingMetadata: 30,
  deadLetter: 30,
  audit: 5 * 365,
} as const;

export class RetentionService {
  constructor(
    private readonly db: PrismaClient,
    private readonly batchSize = 500,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async runOnce() {
    const now = this.now();
    const cutoff = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const fiveYearsAgo = new Date(now);
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    const verifiedSettlementThreshold = cutoff(RETENTION_DAYS.verifiedViewing);
    const verifiedSettlementCutoff = new Date(
      Date.UTC(
        verifiedSettlementThreshold.getUTCFullYear(),
        verifiedSettlementThreshold.getUTCMonth(),
        1,
      ),
    );

    const [verificationTokens, resetTokens, sessions] = await Promise.all([
      this.db.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoff(RETENTION_DAYS.authTokenGrace) } },
            { usedAt: { not: null, lt: cutoff(RETENTION_DAYS.authTokenGrace) } },
          ],
        },
      }),
      this.db.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoff(RETENTION_DAYS.authTokenGrace) } },
            { usedAt: { not: null, lt: cutoff(RETENTION_DAYS.authTokenGrace) } },
          ],
        },
      }),
      this.db.session.deleteMany({
        where: { expiresAt: { lt: cutoff(RETENTION_DAYS.sessionGrace) } },
      }),
    ]);

    const verifiedIntervals = await this.db.verifiedWatchInterval.deleteMany({
      where: { createdAt: { lt: verifiedSettlementCutoff } },
    });
    const playbackSessions = await this.db.playbackSession.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.playback) } },
    });

    const payloadsPurged = await this.db.outboxEvent.updateMany({
      where: {
        status: 'PUBLISHED',
        inboxJob: {
          is: {
            status: 'COMPLETED',
            completedAt: { lt: cutoff(RETENTION_DAYS.processedPayload) },
          },
        },
      },
      data: { payload: { purged: true } },
    });

    const deadLetters = await this.db.deadLetterJob.findMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.deadLetter) } },
      select: { id: true, inboxJobId: true, inboxJob: { select: { outboxEventId: true } } },
      take: this.batchSize,
    });
    if (deadLetters.length) {
      await this.db.$transaction([
        this.db.deadLetterJob.deleteMany({
          where: { id: { in: deadLetters.map(({ id }) => id) } },
        }),
        this.db.inboxJob.deleteMany({
          where: { id: { in: deadLetters.map(({ inboxJobId }) => inboxJobId) } },
        }),
        this.db.outboxEvent.deleteMany({
          where: {
            id: { in: deadLetters.map(({ inboxJob }) => inboxJob.outboxEventId) },
          },
        }),
      ]);
    }

    const completedJobs = await this.db.inboxJob.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { lt: cutoff(RETENTION_DAYS.messagingMetadata) },
      },
      select: { id: true, outboxEventId: true },
      take: this.batchSize,
    });
    if (completedJobs.length) {
      await this.db.$transaction([
        this.db.inboxJob.deleteMany({ where: { id: { in: completedJobs.map(({ id }) => id) } } }),
        this.db.outboxEvent.deleteMany({
          where: { id: { in: completedJobs.map(({ outboxEventId }) => outboxEventId) } },
        }),
      ]);
    }

    const [auditLogs, deletionReceipts] = await Promise.all([
      this.db.auditLog.deleteMany({
        where: { createdAt: { lt: fiveYearsAgo } },
      }),
      this.db.accountDeletionRequest.deleteMany({
        where: { completedAt: { not: null }, retainUntil: { lte: now } },
      }),
    ]);

    return {
      verificationTokens: verificationTokens.count,
      resetTokens: resetTokens.count,
      sessions: sessions.count,
      verifiedIntervals: verifiedIntervals.count,
      playbackSessions: playbackSessions.count,
      payloadsPurged: payloadsPurged.count,
      deadLetters: deadLetters.length,
      completedJobs: completedJobs.length,
      auditLogs: auditLogs.count,
      deletionReceipts: deletionReceipts.count,
    };
  }
}
