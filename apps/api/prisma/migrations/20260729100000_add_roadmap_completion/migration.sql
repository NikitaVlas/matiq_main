ALTER TABLE "RoadmapItem"
ADD COLUMN "completedAt" TIMESTAMP(3);

DROP INDEX "RoadmapItem_athleteProfileId_discipline_position_idx";

CREATE INDEX "RoadmapItem_athleteProfileId_discipline_completedAt_position_idx"
ON "RoadmapItem"("athleteProfileId", "discipline", "completedAt", "position");
