CREATE TYPE "PlaybackMode" AS ENUM ('FULL', 'PREVIEW');
CREATE TYPE "PlaybackSessionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED', 'REVOKED');

CREATE TABLE "PlaybackSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "mode" "PlaybackMode" NOT NULL DEFAULT 'FULL',
    "status" "PlaybackSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokenHash" TEXT NOT NULL,
    "watermarkId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "creditedPositionSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaybackHeartbeat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "previousPositionSec" DOUBLE PRECISION NOT NULL,
    "currentPositionSec" DOUBLE PRECISION NOT NULL,
    "activePlaybackMs" INTEGER NOT NULL,
    "playbackRate" DOUBLE PRECISION NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL,
    "clientAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL,
    "creditedPositionSec" INTEGER NOT NULL,
    "rejectionReason" TEXT,
    CONSTRAINT "PlaybackHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlaybackSession_tokenHash_key" ON "PlaybackSession"("tokenHash");
CREATE INDEX "PlaybackSession_userId_mode_status_idx" ON "PlaybackSession"("userId", "mode", "status");
CREATE UNIQUE INDEX "PlaybackSession_one_active_full_per_user_key"
ON "PlaybackSession"("userId")
WHERE "mode" = 'FULL' AND "status" = 'ACTIVE';
CREATE INDEX "PlaybackSession_videoId_createdAt_idx" ON "PlaybackSession"("videoId", "createdAt");
CREATE UNIQUE INDEX "PlaybackHeartbeat_sessionId_idempotencyKey_key" ON "PlaybackHeartbeat"("sessionId", "idempotencyKey");
CREATE UNIQUE INDEX "PlaybackHeartbeat_sessionId_sequence_key" ON "PlaybackHeartbeat"("sessionId", "sequence");
CREATE INDEX "PlaybackHeartbeat_sessionId_receivedAt_idx" ON "PlaybackHeartbeat"("sessionId", "receivedAt");

ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackHeartbeat" ADD CONSTRAINT "PlaybackHeartbeat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaybackSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
