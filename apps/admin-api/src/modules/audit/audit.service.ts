import { Injectable } from '@nestjs/common';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: AdminDatabaseService) {}
  record(action: string, entity: string, entityId: string, metadata: unknown) {
    return this.db.auditLog.create({
      data: { action, entity, entityId, actor: 'local-admin', metadata: metadata as object },
    });
  }
}
