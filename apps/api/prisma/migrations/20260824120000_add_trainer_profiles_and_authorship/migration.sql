ALTER TABLE "Video" ADD COLUMN "trainerId" TEXT;
ALTER TABLE "Course" ADD COLUMN "trainerId" TEXT;

CREATE TABLE "TrainerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "biography" TEXT NOT NULL,
    "athleteJourney" TEXT NOT NULL,
    "disciplines" "Discipline"[],
    "belt" "Belt",
    "qualifications" TEXT[],
    "achievements" TEXT[],
    "competitionExperience" TEXT,
    "trainingPrinciples" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'DE',
    "languages" TEXT[],
    "localAvailability" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerProfile_userId_key" ON "TrainerProfile"("userId");
CREATE UNIQUE INDEX "TrainerProfile_slug_key" ON "TrainerProfile"("slug");
CREATE INDEX "Video_trainerId_idx" ON "Video"("trainerId");
CREATE INDEX "Course_trainerId_idx" ON "Course"("trainerId");

ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
