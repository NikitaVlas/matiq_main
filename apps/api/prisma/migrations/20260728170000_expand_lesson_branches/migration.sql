CREATE TABLE "BranchTrigger" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchTrigger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchTrigger_key_key" ON "BranchTrigger"("key");

INSERT INTO "BranchTrigger" ("id", "key", "name") VALUES
    ('branch-trigger-opponent-reaction', 'opponent-reaction', 'Opponent reaction'),
    ('branch-trigger-alternative-technique', 'alternative-technique', 'Alternative technique');

ALTER TABLE "LessonRelation" ADD COLUMN "triggerId" TEXT;

UPDATE "LessonRelation"
SET "triggerId" = CASE
    WHEN "type" = 'REACTION' THEN 'branch-trigger-opponent-reaction'
    WHEN "type" = 'ALTERNATIVE' THEN 'branch-trigger-alternative-technique'
    ELSE NULL
END;

CREATE TYPE "LessonRelationType_new" AS ENUM ('PRIMARY', 'BRANCH');

ALTER TABLE "LessonRelation"
ALTER COLUMN "type" TYPE "LessonRelationType_new"
USING (
    CASE
        WHEN "type" = 'NEXT' THEN 'PRIMARY'
        ELSE 'BRANCH'
    END
)::"LessonRelationType_new";

ALTER TYPE "LessonRelationType" RENAME TO "LessonRelationType_old";
ALTER TYPE "LessonRelationType_new" RENAME TO "LessonRelationType";
DROP TYPE "LessonRelationType_old";

DROP INDEX "LessonRelation_fromLessonId_toLessonId_type_key";
CREATE UNIQUE INDEX "LessonRelation_fromLessonId_toLessonId_type_triggerId_key"
ON "LessonRelation"("fromLessonId", "toLessonId", "type", "triggerId");

ALTER TABLE "LessonRelation"
ADD CONSTRAINT "LessonRelation_triggerId_fkey"
FOREIGN KEY ("triggerId") REFERENCES "BranchTrigger"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
