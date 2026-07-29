ALTER TABLE "RoadmapItem"
ADD COLUMN "discipline" "Discipline";

UPDATE "RoadmapItem" AS item
SET "discipline" = COALESCE(
  (
    SELECT profile."disciplines"[1]
    FROM "AthleteProfile" AS profile
    WHERE profile."id" = item."athleteProfileId"
  ),
  'BJJ_GI'::"Discipline"
);

ALTER TABLE "RoadmapItem"
ALTER COLUMN "discipline" SET NOT NULL;

DROP INDEX "RoadmapItem_athleteProfileId_position_idx";

CREATE INDEX "RoadmapItem_athleteProfileId_discipline_position_idx"
ON "RoadmapItem"("athleteProfileId", "discipline", "position");
