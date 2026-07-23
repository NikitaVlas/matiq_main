ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCEL_AT_PERIOD_END';

ALTER TABLE "Subscription"
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");
