CREATE TYPE "LessonRelationType" AS ENUM ('NEXT', 'REACTION', 'ALTERNATIVE');

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "discipline" "Discipline" NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_key_key" ON "Course"("key");

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseModule_courseId_key_key" ON "CourseModule"("courseId", "key");
CREATE INDEX "CourseModule_courseId_position_idx" ON "CourseModule"("courseId", "position");

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT,
  "startingPosition" TEXT,
  "endingPosition" TEXT,
  "level" TEXT,
  "giNoGi" TEXT,
  "reactions" TEXT[] NOT NULL,
  "position" INTEGER NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Lesson_videoId_key" ON "Lesson"("videoId");
CREATE UNIQUE INDEX "Lesson_moduleId_key_key" ON "Lesson"("moduleId", "key");
CREATE INDEX "Lesson_moduleId_position_idx" ON "Lesson"("moduleId", "position");

CREATE TABLE "LessonRelation" (
  "id" TEXT NOT NULL,
  "fromLessonId" TEXT NOT NULL,
  "toLessonId" TEXT NOT NULL,
  "type" "LessonRelationType" NOT NULL,
  "condition" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LessonRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonRelation_fromLessonId_toLessonId_type_key" ON "LessonRelation"("fromLessonId", "toLessonId", "type");
CREATE INDEX "LessonRelation_fromLessonId_type_position_idx" ON "LessonRelation"("fromLessonId", "type", "position");

ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonRelation" ADD CONSTRAINT "LessonRelation_fromLessonId_fkey" FOREIGN KEY ("fromLessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonRelation" ADD CONSTRAINT "LessonRelation_toLessonId_fkey" FOREIGN KEY ("toLessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;