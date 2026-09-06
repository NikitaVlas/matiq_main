import { Inject, Injectable } from '@nestjs/common';
import { PostgresPrivacyOperationsMonitor } from '@matiq/backend';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';

@Injectable()
export class PrivacyOperationsService {
  private readonly monitor: PostgresPrivacyOperationsMonitor;

  constructor(@Inject(AdminDatabaseService) db: AdminDatabaseService) {
    this.monitor = new PostgresPrivacyOperationsMonitor(db);
  }

  status() {
    return this.monitor.snapshot();
  }

  async retry(actorId: string) {
    const result = await this.monitor.retry(actorId);
    return { ...result, status: await this.monitor.snapshot() };
  }
}
