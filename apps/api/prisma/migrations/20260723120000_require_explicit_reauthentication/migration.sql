ALTER TABLE "Session" ALTER COLUMN "reauthenticatedAt" DROP DEFAULT;
ALTER TABLE "Session" ALTER COLUMN "reauthenticatedAt" DROP NOT NULL;
UPDATE "Session" SET "reauthenticatedAt" = NULL;
