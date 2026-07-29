CREATE TYPE "AssessmentQuestionKind" AS ENUM ('CONFIDENCE', 'PREFERENCE', 'GOAL');
CREATE TYPE "AssessmentMappingStatus" AS ENUM ('MAPPED', 'UNMAPPED');
CREATE TYPE "RoadmapRecommendationType" AS ENUM ('CORE', 'GAP', 'EXPLORE');

ALTER TABLE "AssessmentQuestion"
  ADD COLUMN "kind" "AssessmentQuestionKind" NOT NULL DEFAULT 'CONFIDENCE',
  ADD COLUMN "multiple" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowCustom" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AssessmentResponse"
  ADD COLUMN "customText" TEXT,
  ADD COLUMN "mappedSkillKey" TEXT,
  ADD COLUMN "mappingStatus" "AssessmentMappingStatus" NOT NULL DEFAULT 'MAPPED';

ALTER TABLE "RoadmapItem"
  ADD COLUMN "recommendationType" "RoadmapRecommendationType" NOT NULL DEFAULT 'GAP';

DROP INDEX "AssessmentResponse_assessmentId_questionId_key";
CREATE UNIQUE INDEX "AssessmentResponse_assessmentId_questionId_optionKey_key"
  ON "AssessmentResponse"("assessmentId", "questionId", "optionKey");
