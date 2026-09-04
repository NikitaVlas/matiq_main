CREATE TABLE "AccountDeletionSchedule" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "executeAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AccountDeletionSchedule_executeAt_idx" ON "AccountDeletionSchedule" ("executeAt");
