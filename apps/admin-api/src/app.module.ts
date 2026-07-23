import { Module } from '@nestjs/common';
import { AdminModule } from './modules/admin/admin.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminDatabaseModule } from './shared/infrastructure/admin-database.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TrainerModule } from './modules/trainer/trainer.module';
import { VideoModule } from './modules/video/video.module';
import { ContentModule } from './modules/content/content.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AuditModule } from './modules/audit/audit.module';
import { RoleModule } from './modules/roles/role.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminDatabaseModule,
    DashboardModule,
    TrainerModule,
    VideoModule,
    ContentModule,
    AssessmentModule,
    AuditModule,
    RoleModule,
    AdminModule,
  ],
})
export class AppModule {}
