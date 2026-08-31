CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PUBLISHED');
CREATE TYPE "InboxJobStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InboxJob" (
    "id" TEXT NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "InboxJobStatus" NOT NULL DEFAULT 'PROCESSING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InboxJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeadLetterJob" (
    "id" TEXT NOT NULL,
    "inboxJobId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeadLetterJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX "OutboxEvent_status_availableAt_createdAt_idx" ON "OutboxEvent"("status", "availableAt", "createdAt");
CREATE UNIQUE INDEX "InboxJob_outboxEventId_key" ON "InboxJob"("outboxEventId");
CREATE INDEX "InboxJob_status_updatedAt_idx" ON "InboxJob"("status", "updatedAt");
CREATE UNIQUE INDEX "DeadLetterJob_inboxJobId_key" ON "DeadLetterJob"("inboxJobId");
CREATE INDEX "DeadLetterJob_createdAt_idx" ON "DeadLetterJob"("createdAt");

ALTER TABLE "InboxJob" ADD CONSTRAINT "InboxJob_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeadLetterJob" ADD CONSTRAINT "DeadLetterJob_inboxJobId_fkey" FOREIGN KEY ("inboxJobId") REFERENCES "InboxJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
