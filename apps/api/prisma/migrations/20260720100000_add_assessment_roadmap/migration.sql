CREATE TYPE "AssessmentContext" AS ENUM ('STANDING', 'TOP', 'BOTTOM');
CREATE TYPE "RoadmapItemType" AS ENUM ('POSITION', 'SKILL_GROUP', 'TECHNIQUE');

CREATE TABLE "Assessment" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AssessmentQuestion" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "text" TEXT NOT NULL, "context" "AssessmentContext" NOT NULL, "skillKey" TEXT NOT NULL, "options" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AssessmentResponse" ("id" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "questionId" TEXT NOT NULL, "optionKey" TEXT NOT NULL, "value" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SkillScore" ("id" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "skillKey" TEXT NOT NULL, "score" INTEGER NOT NULL, CONSTRAINT "SkillScore_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RoadmapItem" ("id" TEXT NOT NULL, "athleteProfileId" TEXT NOT NULL, "type" "RoadmapItemType" NOT NULL, "title" TEXT NOT NULL, "context" "AssessmentContext", "skillKey" TEXT, "position" INTEGER NOT NULL, "isAddedByUser" BOOLEAN NOT NULL DEFAULT false, "isHidden" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Assessment_userId_key" ON "Assessment"("userId");
CREATE UNIQUE INDEX "AssessmentQuestion_key_key" ON "AssessmentQuestion"("key");
CREATE UNIQUE INDEX "AssessmentResponse_assessmentId_questionId_key" ON "AssessmentResponse"("assessmentId", "questionId");
CREATE UNIQUE INDEX "SkillScore_assessmentId_skillKey_key" ON "SkillScore"("assessmentId", "skillKey");
CREATE INDEX "RoadmapItem_athleteProfileId_position_idx" ON "RoadmapItem"("athleteProfileId", "position");
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SkillScore" ADD CONSTRAINT "SkillScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
