ALTER TABLE "RoadmapItem" ADD COLUMN "lessonId" TEXT;
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "RoadmapItem_lessonId_idx" ON "RoadmapItem"("lessonId");