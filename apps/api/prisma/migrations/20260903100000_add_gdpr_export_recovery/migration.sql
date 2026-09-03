ALTER TABLE "User" ADD COLUMN "privacySubjectId" TEXT;

UPDATE "User"
SET "privacySubjectId" = 'privacy-' || md5(random()::text || clock_timestamp()::text || "id");

ALTER TABLE "User" ALTER COLUMN "privacySubjectId" SET NOT NULL;

CREATE UNIQUE INDEX "User_privacySubjectId_key" ON "User"("privacySubjectId");

ALTER TABLE "AccountDeletionRequest"
  ADD COLUMN "statusTokenHash" TEXT,
  ADD COLUMN "statusTokenExpiresAt" TIMESTAMP(3);

CREATE TABLE "DeletionTombstone" (
  "id" TEXT NOT NULL,
  "subjectRef" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL,
  "retainUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeletionTombstone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeletionTombstone_subjectRef_key"
  ON "DeletionTombstone"("subjectRef");

CREATE INDEX "DeletionTombstone_retainUntil_idx"
  ON "DeletionTombstone"("retainUntil");
