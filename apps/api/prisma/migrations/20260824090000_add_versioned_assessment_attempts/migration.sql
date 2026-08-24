CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('DRAFT', 'COMPLETED');
CREATE TYPE "AssessmentConfidence" AS ENUM ('SUFFICIENT', 'INSUFFICIENT_DATA');

CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "questionBankVersion" INTEGER NOT NULL DEFAULT 1,
    "questionBankSnapshot" JSONB NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "optionKey" TEXT,
    "customText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentAttemptAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentEvaluation" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "skillKey" TEXT NOT NULL,
    "score" INTEGER,
    "confidence" "AssessmentConfidence" NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentAttemptAnswer_attemptId_questionKey_optionKey_key" ON "AssessmentAttemptAnswer"("attemptId", "questionKey", "optionKey");
CREATE UNIQUE INDEX "AssessmentEvaluation_attemptId_skillKey_key" ON "AssessmentEvaluation"("attemptId", "skillKey");
CREATE INDEX "AssessmentAttempt_userId_discipline_status_idx" ON "AssessmentAttempt"("userId", "discipline", "status");
CREATE UNIQUE INDEX "AssessmentAttempt_one_draft_per_discipline_key"
  ON "AssessmentAttempt"("userId", "discipline") WHERE "status" = 'DRAFT';

ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttemptAnswer" ADD CONSTRAINT "AssessmentAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
