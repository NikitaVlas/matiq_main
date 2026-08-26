-- CreateEnum
CREATE TYPE "ViewingAccessClass" AS ENUM ('TRIAL', 'PAID');

-- AlterTable
ALTER TABLE "PlaybackSession" ADD COLUMN "accessClass" "ViewingAccessClass";

-- CreateTable
CREATE TABLE "VerifiedWatchInterval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "trainerId" TEXT,
    "sessionId" TEXT NOT NULL,
    "heartbeatId" TEXT NOT NULL,
    "accessClass" "ViewingAccessClass" NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedWatchInterval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerifiedWatchInterval_userId_videoId_startMs_endMs_idx" ON "VerifiedWatchInterval"("userId", "videoId", "startMs", "endMs");
CREATE INDEX "VerifiedWatchInterval_trainerId_accessClass_createdAt_idx" ON "VerifiedWatchInterval"("trainerId", "accessClass", "createdAt");
CREATE INDEX "VerifiedWatchInterval_videoId_accessClass_createdAt_idx" ON "VerifiedWatchInterval"("videoId", "accessClass", "createdAt");

-- AddForeignKey
ALTER TABLE "VerifiedWatchInterval" ADD CONSTRAINT "VerifiedWatchInterval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifiedWatchInterval" ADD CONSTRAINT "VerifiedWatchInterval_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifiedWatchInterval" ADD CONSTRAINT "VerifiedWatchInterval_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaybackSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifiedWatchInterval" ADD CONSTRAINT "VerifiedWatchInterval_heartbeatId_fkey" FOREIGN KEY ("heartbeatId") REFERENCES "PlaybackHeartbeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
