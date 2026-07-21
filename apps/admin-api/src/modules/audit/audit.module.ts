import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/** Audit log feature boundary. */
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
