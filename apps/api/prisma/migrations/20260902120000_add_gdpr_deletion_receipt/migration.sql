ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "subjectRef" TEXT,
  ADD COLUMN "retainUntil" TIMESTAMP(3);

UPDATE "AccountDeletionRequest"
SET
  "subjectRef" = 'legacy-' || "id",
  "retainUntil" = date_trunc('year', COALESCE("completedAt", "requestedAt"))
    + INTERVAL '4 years';

ALTER TABLE "AccountDeletionRequest"
  ALTER COLUMN "userId" DROP NOT NULL,
  ALTER COLUMN "subjectRef" SET NOT NULL,
  ALTER COLUMN "retainUntil" SET NOT NULL;

ALTER TABLE "AccountDeletionRequest"
  DROP CONSTRAINT "AccountDeletionRequest_userId_fkey";

ALTER TABLE "AccountDeletionRequest"
  ADD CONSTRAINT "AccountDeletionRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AccountDeletionRequest_subjectRef_key"
  ON "AccountDeletionRequest"("subjectRef");

CREATE INDEX "AccountDeletionRequest_completedAt_retainUntil_idx"
  ON "AccountDeletionRequest"("completedAt", "retainUntil");

ALTER TABLE "VerifiedWatchInterval"
  DROP CONSTRAINT "VerifiedWatchInterval_sessionId_fkey",
  DROP CONSTRAINT "VerifiedWatchInterval_heartbeatId_fkey",
  ALTER COLUMN "sessionId" DROP NOT NULL,
  ALTER COLUMN "heartbeatId" DROP NOT NULL;

ALTER TABLE "VerifiedWatchInterval"
  ADD CONSTRAINT "VerifiedWatchInterval_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "VerifiedWatchInterval_heartbeatId_fkey"
  FOREIGN KEY ("heartbeatId") REFERENCES "PlaybackHeartbeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
