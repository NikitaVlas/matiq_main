import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({ imports: [AuditModule], controllers: [RoleController], providers: [RoleService] })
export class RoleModule {}
