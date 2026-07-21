CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL','ACTIVE','EXPIRED','CANCELED');
CREATE TABLE "Subscription" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"status" "SubscriptionStatus" NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"endsAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Subscription_userId_status_endsAt_idx" ON "Subscription"("userId","status","endsAt");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
