CREATE TYPE "AccountExportStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DOWNLOADED', 'EXPIRED');

CREATE TABLE "AccountExportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AccountExportStatus" NOT NULL DEFAULT 'PENDING',
    "downloadTokenHash" TEXT NOT NULL,
    "ciphertext" BYTEA,
    "iv" BYTEA,
    "authTag" BYTEA,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "failureCode" TEXT,
    CONSTRAINT "AccountExportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountExportRequest_userId_requestedAt_idx" ON "AccountExportRequest"("userId", "requestedAt");
CREATE INDEX "AccountExportRequest_status_expiresAt_idx" ON "AccountExportRequest"("status", "expiresAt");
ALTER TABLE "AccountExportRequest" ADD CONSTRAINT "AccountExportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
