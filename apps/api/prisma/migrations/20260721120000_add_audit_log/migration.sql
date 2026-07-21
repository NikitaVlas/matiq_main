CREATE TABLE "AuditLog" ("id" TEXT NOT NULL,"action" TEXT NOT NULL,"entity" TEXT NOT NULL,"entityId" TEXT,"actor" TEXT NOT NULL,"metadata" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity","createdAt");
