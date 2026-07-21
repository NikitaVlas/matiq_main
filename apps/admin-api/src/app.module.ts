import { Module } from '@nestjs/common';
import { AdminModule } from './modules/admin/admin.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminDatabaseModule } from './shared/infrastructure/admin-database.module';

@Module({ imports: [AdminAuthModule, AdminDatabaseModule, AdminModule] })
export class AppModule {}
