CREATE TYPE "TrainerAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'VOID');
CREATE TYPE "TrainerPayoutStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'PAID', 'VOID');

CREATE TABLE "TrainerAgreement" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "TrainerAgreementStatus" NOT NULL DEFAULT 'DRAFT',
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "participatesInPool" BOOLEAN NOT NULL DEFAULT true,
  "fixedFeeCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "specialTerms" TEXT,
  "documentStorageKey" TEXT,
  "documentChecksumSha256" TEXT,
  "documentFileName" TEXT,
  "documentUploadedAt" TIMESTAMP(3),
  "supersedesAgreementId" TEXT,
  "createdByAdminId" TEXT NOT NULL,
  "approvedByAdminId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainerAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainerSettlementPeriod" (
  "id" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "grossRevenueCents" INTEGER NOT NULL,
  "vatCents" INTEGER NOT NULL,
  "refundsCents" INTEGER NOT NULL,
  "chargebacksCents" INTEGER NOT NULL,
  "providerFeesCents" INTEGER NOT NULL,
  "netRevenueCents" INTEGER NOT NULL,
  "poolBasisPoints" INTEGER NOT NULL DEFAULT 3000,
  "distributablePoolCents" INTEGER NOT NULL,
  "totalPaidWatchMs" BIGINT NOT NULL,
  "totalTrialWatchMs" BIGINT NOT NULL,
  "policySnapshot" JSONB NOT NULL,
  "createdByAdminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerSettlementPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainerPayoutReport" (
  "id" TEXT NOT NULL,
  "settlementPeriodId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "agreementId" TEXT,
  "status" "TrainerPayoutStatus" NOT NULL DEFAULT 'DRAFT',
  "paidWatchMs" BIGINT NOT NULL,
  "trialWatchMs" BIGINT NOT NULL,
  "trainerWeightNumerator" BIGINT NOT NULL,
  "trainerWeightDenominator" BIGINT NOT NULL,
  "poolShareCents" INTEGER NOT NULL,
  "fixedFeeCents" INTEGER NOT NULL,
  "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
  "adjustmentReason" TEXT,
  "carriedInCents" INTEGER NOT NULL DEFAULT 0,
  "payableCents" INTEGER NOT NULL DEFAULT 0,
  "carriedOutCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "reviewedByAdminId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedByAdminId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidByAdminId" TEXT,
  "paidAt" TIMESTAMP(3),
  "externalPaymentReference" TEXT,
  "voidedByAdminId" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainerPayoutReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerAgreement_trainerId_version_key" ON "TrainerAgreement"("trainerId", "version");
CREATE INDEX "TrainerAgreement_trainerId_status_validFrom_idx" ON "TrainerAgreement"("trainerId", "status", "validFrom");
CREATE UNIQUE INDEX "TrainerSettlementPeriod_month_key" ON "TrainerSettlementPeriod"("month");
CREATE UNIQUE INDEX "TrainerSettlementPeriod_periodStart_periodEnd_key" ON "TrainerSettlementPeriod"("periodStart", "periodEnd");
CREATE INDEX "TrainerSettlementPeriod_createdAt_idx" ON "TrainerSettlementPeriod"("createdAt");
CREATE UNIQUE INDEX "TrainerPayoutReport_settlementPeriodId_trainerId_key" ON "TrainerPayoutReport"("settlementPeriodId", "trainerId");
CREATE INDEX "TrainerPayoutReport_trainerId_status_createdAt_idx" ON "TrainerPayoutReport"("trainerId", "status", "createdAt");

ALTER TABLE "TrainerAgreement" ADD CONSTRAINT "TrainerAgreement_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainerAgreement" ADD CONSTRAINT "TrainerAgreement_supersedesAgreementId_fkey" FOREIGN KEY ("supersedesAgreementId") REFERENCES "TrainerAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainerPayoutReport" ADD CONSTRAINT "TrainerPayoutReport_settlementPeriodId_fkey" FOREIGN KEY ("settlementPeriodId") REFERENCES "TrainerSettlementPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainerPayoutReport" ADD CONSTRAINT "TrainerPayoutReport_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainerPayoutReport" ADD CONSTRAINT "TrainerPayoutReport_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "TrainerAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
