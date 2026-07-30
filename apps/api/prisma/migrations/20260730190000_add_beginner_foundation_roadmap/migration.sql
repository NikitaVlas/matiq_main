CREATE TYPE "RoadmapItemSource" AS ENUM ('ASSESSMENT', 'FOUNDATION', 'MANUAL');

ALTER TABLE "AthleteProfile" ADD COLUMN "experienceMonths" INTEGER;
ALTER TABLE "RoadmapItem" ADD COLUMN "source" "RoadmapItemSource" NOT NULL DEFAULT 'ASSESSMENT', ADD COLUMN "foundationStepId" TEXT;
UPDATE "RoadmapItem" SET "source" = 'MANUAL' WHERE "isAddedByUser" = true;

CREATE TABLE "FoundationTemplate" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL,
  "discipline" "Discipline" NOT NULL, "belt" "Belt" NOT NULL DEFAULT 'WHITE',
  "minExperienceMonths" INTEGER NOT NULL DEFAULT 0, "maxExperienceMonths" INTEGER NOT NULL DEFAULT 6,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FoundationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FoundationStep" (
  "id" TEXT NOT NULL, "templateId" TEXT NOT NULL, "key" TEXT NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "skillKey" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "FoundationStep_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FoundationTemplate_key_key" ON "FoundationTemplate"("key");
CREATE UNIQUE INDEX "FoundationStep_templateId_key_key" ON "FoundationStep"("templateId", "key");
CREATE INDEX "FoundationStep_templateId_active_position_idx" ON "FoundationStep"("templateId", "active", "position");
ALTER TABLE "FoundationStep" ADD CONSTRAINT "FoundationStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FoundationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_foundationStepId_fkey" FOREIGN KEY ("foundationStepId") REFERENCES "FoundationStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "RoadmapItem_athleteProfileId_foundationStepId_key" ON "RoadmapItem"("athleteProfileId", "foundationStepId");

INSERT INTO "FoundationTemplate" ("id", "key", "name", "discipline", "belt", "minExperienceMonths", "maxExperienceMonths", "updatedAt") VALUES
('foundation-bjj-gi', 'bjj-gi-foundations', 'BJJ Gi Grundlagen', 'BJJ_GI', 'WHITE', 0, 6, CURRENT_TIMESTAMP),
('foundation-no-gi', 'no-gi-foundations', 'No-Gi Grundlagen', 'NO_GI_GRAPPLING', 'WHITE', 0, 6, CURRENT_TIMESTAMP);

INSERT INTO "FoundationStep" ("id", "templateId", "key", "title", "description", "skillKey", "position") VALUES
('foundation-gi-movement', 'foundation-bjj-gi', 'movement-basics', 'Grundbewegungen', 'Shrimp, Bridge, Frames, Technical Stand-up und sicheres Fallen.', 'movement-basics', 0),
('foundation-gi-escapes', 'foundation-bjj-gi', 'bottom-escapes', 'Grundlegende Escapes', 'Side-Control- und Mount-Escapes sowie Guard Recovery.', 'bottom-escape', 1),
('foundation-gi-standing', 'foundation-bjj-gi', 'standing-basics', 'Grundlagen im Stand', 'Stabiler Stand, Distanz, Griffe und ein grundlegender Takedown.', 'standing', 2),
('foundation-gi-guard', 'foundation-bjj-gi', 'closed-guard-basics', 'Grundlagen der Closed Guard', 'Haltung brechen, kontrollieren und sicher arbeiten.', 'closed-guard', 3),
('foundation-gi-sweeps', 'foundation-bjj-gi', 'sweep-basics', 'Grundlegende Sweeps', 'Scissor Sweep, Hip Bump Sweep und ein einfacher Open-Guard-Sweep.', 'sweep-basics', 4),
('foundation-gi-passing', 'foundation-bjj-gi', 'guard-passing-basics', 'Grundlagen des Guard Passing', 'Closed Guard öffnen, Toreando und Knee Cut.', 'guard-passing-basics', 5),
('foundation-gi-control', 'foundation-bjj-gi', 'top-control-basics', 'Grundkontrolle von oben', 'Side Control, Mount und sichere Positionswechsel.', 'top-control', 6),
('foundation-nogi-movement', 'foundation-no-gi', 'movement-basics', 'Grundbewegungen', 'Shrimp, Bridge, Frames, Technical Stand-up und sicheres Fallen.', 'movement-basics', 0),
('foundation-nogi-escapes', 'foundation-no-gi', 'bottom-escapes', 'Grundlegende Escapes', 'Side-Control- und Mount-Escapes sowie Guard Recovery.', 'bottom-escape', 1),
('foundation-nogi-standing', 'foundation-no-gi', 'standing-basics', 'Grundlagen im Stand', 'Stabiler Stand, Distanz, Handfighting und ein grundlegender Takedown.', 'standing', 2),
('foundation-nogi-guard', 'foundation-no-gi', 'guard-basics', 'Grundlagen der Guard', 'Distanz, Frames und sichere Guard Retention.', 'open-guard', 3),
('foundation-nogi-sweeps', 'foundation-no-gi', 'sweep-basics', 'Grundlegende Sweeps', 'Hip Bump, Tripod Sweep und ein einfacher Butterfly Sweep.', 'sweep-basics', 4),
('foundation-nogi-passing', 'foundation-no-gi', 'guard-passing-basics', 'Grundlagen des Guard Passing', 'Beinkontrolle, Toreando und Knee Cut.', 'guard-passing-basics', 5),
('foundation-nogi-control', 'foundation-no-gi', 'top-control-basics', 'Grundkontrolle von oben', 'Side Control, Mount und sichere Positionswechsel.', 'top-control', 6);
