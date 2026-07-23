import { Global, Module } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminDatabaseModule } from '../../shared/infrastructure/admin-database.module';

@Global()
@Module({ imports: [AdminDatabaseModule], providers: [AdminAuthGuard], exports: [AdminAuthGuard] })
export class AdminAuthModule {}
