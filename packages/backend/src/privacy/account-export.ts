import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

type ExportPayoutReport = Record<string, unknown> & {
  paidWatchMs: bigint;
  trialWatchMs: bigint;
  trainerWeightNumerator: bigint;
  trainerWeightDenominator: bigint;
};

type ExportUser = {
  email: string;
  role: unknown;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  athleteProfile: unknown;
  assessment: unknown;
  assessmentAttempts: unknown[];
  subscriptions: unknown[];
  videoWatches: unknown[];
  playbackSessions: unknown[];
  verifiedWatchIntervals: unknown[];
  trainerProfile: unknown;
  authoredCourses: unknown[];
  authoredVideos: unknown[];
  trainerAgreements: unknown[];
  trainerPayoutReports: ExportPayoutReport[];
};

export type AccountExportDatabase = {
  user: { findUniqueOrThrow(args: Record<string, unknown>): Promise<ExportUser> };
};

const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export const accountExportTokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function accountExportKey(value = process.env.ACCOUNT_EXPORT_ENCRYPTION_KEY) {
  if (!value && process.env.NODE_ENV !== 'production')
    return createHash('sha256').update('matiq-local-account-export-key').digest();
  const key = value ? Buffer.from(value, 'base64') : Buffer.alloc(0);
  if (key.length !== 32) throw new Error('ACCOUNT_EXPORT_ENCRYPTION_KEY_INVALID');
  return key;
}

export function encryptAccountExport(value: unknown, key = accountExportKey()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptAccountExport(
  encrypted: { ciphertext: Uint8Array; iv: Uint8Array; authTag: Uint8Array },
  key = accountExportKey(),
) {
  const decipher = createDecipheriv('aes-256-gcm', key, encrypted.iv);
  decipher.setAuthTag(Buffer.from(encrypted.authTag));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext)),
    decipher.final(),
  ]).toString('utf8');
}

export const accountExportExpiresAt = (completedAt = new Date()) =>
  new Date(completedAt.getTime() + EXPORT_TTL_MS);

export async function buildAccountExport(db: AccountExportDatabase, userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      athleteProfile: { include: { roadmapItems: true } },
      assessment: { include: { responses: true, scores: true } },
      assessmentAttempts: {
        include: { answers: true, evaluations: true },
        orderBy: { createdAt: 'asc' },
      },
      subscriptions: { orderBy: { createdAt: 'asc' } },
      videoWatches: { orderBy: { createdAt: 'asc' } },
      playbackSessions: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          videoId: true,
          mode: true,
          status: true,
          expiresAt: true,
          lastHeartbeatAt: true,
          creditedPositionSec: true,
          accessClass: true,
          createdAt: true,
          closedAt: true,
          heartbeats: {
            orderBy: { receivedAt: 'asc' },
            select: {
              sequence: true,
              previousPositionSec: true,
              currentPositionSec: true,
              activePlaybackMs: true,
              playbackRate: true,
              visible: true,
              active: true,
              clientAt: true,
              receivedAt: true,
              accepted: true,
              creditedPositionSec: true,
              rejectionReason: true,
            },
          },
        },
      },
      verifiedWatchIntervals: {
        orderBy: { createdAt: 'asc' },
        select: {
          videoId: true,
          trainerId: true,
          accessClass: true,
          startMs: true,
          endMs: true,
          durationMs: true,
          createdAt: true,
        },
      },
      trainerProfile: true,
      authoredCourses: { select: { id: true, title: true, published: true } },
      authoredVideos: { select: { id: true, title: true, published: true } },
      trainerAgreements: { orderBy: { version: 'asc' } },
      trainerPayoutReports: { orderBy: { createdAt: 'asc' } },
    },
  });
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    athleteProfile: user.athleteProfile,
    assessment: user.assessment,
    assessmentAttempts: user.assessmentAttempts,
    subscriptions: user.subscriptions,
    viewing: {
      history: user.videoWatches,
      playbackSessions: user.playbackSessions,
      verifiedIntervals: user.verifiedWatchIntervals,
    },
    trainer: {
      profile: user.trainerProfile,
      courses: user.authoredCourses,
      videos: user.authoredVideos,
      agreements: user.trainerAgreements,
      payoutReports: user.trainerPayoutReports.map(
        ({
          paidWatchMs,
          trialWatchMs,
          trainerWeightNumerator,
          trainerWeightDenominator,
          ...report
        }) => ({
          ...report,
          paidWatchMs: paidWatchMs.toString(),
          trialWatchMs: trialWatchMs.toString(),
          trainerWeightNumerator: trainerWeightNumerator.toString(),
          trainerWeightDenominator: trainerWeightDenominator.toString(),
        }),
      ),
    },
  };
}
