ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionRequest_userId_key" ON "AccountDeletionRequest"("userId");
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
