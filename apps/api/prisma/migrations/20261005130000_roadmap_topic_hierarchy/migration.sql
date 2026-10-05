ALTER TABLE "MetadataOption" ADD COLUMN "parentId" TEXT;
CREATE INDEX "MetadataOption_parentId_idx" ON "MetadataOption"("parentId");
ALTER TABLE "MetadataOption" ADD CONSTRAINT "MetadataOption_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "MetadataOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
