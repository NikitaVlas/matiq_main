CREATE TABLE "VideoRevision" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdBy" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoRevision_videoId_approvedAt_idx" ON "VideoRevision"("videoId", "approvedAt");
ALTER TABLE "VideoRevision" ADD CONSTRAINT "VideoRevision_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
