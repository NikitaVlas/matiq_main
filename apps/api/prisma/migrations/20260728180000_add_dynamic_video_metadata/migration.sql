CREATE TABLE "MetadataField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetadataField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetadataOption" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetadataOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoMetadataOption" (
    "videoId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    CONSTRAINT "VideoMetadataOption_pkey" PRIMARY KEY ("videoId", "optionId")
);

CREATE UNIQUE INDEX "MetadataField_key_key" ON "MetadataField"("key");
CREATE UNIQUE INDEX "MetadataOption_fieldId_key_key" ON "MetadataOption"("fieldId", "key");

ALTER TABLE "MetadataOption"
ADD CONSTRAINT "MetadataOption_fieldId_fkey"
FOREIGN KEY ("fieldId") REFERENCES "MetadataField"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoMetadataOption"
ADD CONSTRAINT "VideoMetadataOption_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoMetadataOption"
ADD CONSTRAINT "VideoMetadataOption_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "MetadataOption"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MetadataField" ("id", "key", "name") VALUES
    ('metadata-field-discipline', 'discipline', 'Discipline'),
    ('metadata-field-skill-level', 'skill-level', 'Skill level'),
    ('metadata-field-content-focus', 'content-focus', 'Content focus');

INSERT INTO "MetadataOption" ("id", "fieldId", "key", "name") VALUES
    ('metadata-option-bjj-gi', 'metadata-field-discipline', 'bjj-gi', 'BJJ Gi'),
    ('metadata-option-no-gi', 'metadata-field-discipline', 'no-gi', 'No-Gi Grappling'),
    ('metadata-option-beginner', 'metadata-field-skill-level', 'beginner', 'Beginner'),
    ('metadata-option-intermediate', 'metadata-field-skill-level', 'intermediate', 'Intermediate'),
    ('metadata-option-advanced', 'metadata-field-skill-level', 'advanced', 'Advanced'),
    ('metadata-option-technique', 'metadata-field-content-focus', 'technique', 'Technique'),
    ('metadata-option-drill', 'metadata-field-content-focus', 'drill', 'Drill'),
    ('metadata-option-concept', 'metadata-field-content-focus', 'concept', 'Concept');
