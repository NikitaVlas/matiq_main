import { Inject, Injectable } from '@nestjs/common';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';

@Injectable()
export class AuditService {
  constructor(@Inject(AdminDatabaseService) private readonly db: AdminDatabaseService) {}
  record(action: string, entity: string, entityId: string, actor: string, metadata: unknown) {
    return this.db.auditLog.create({
      data: { action, entity, entityId, actor, metadata: metadata as object },
    });
  }
}
