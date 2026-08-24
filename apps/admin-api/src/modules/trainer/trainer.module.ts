import { Module } from '@nestjs/common';
import { TrainerController } from './trainer.controller';
import { AuditModule } from '../audit/audit.module';

/** Trainer management feature boundary. */
@Module({ imports: [AuditModule], controllers: [TrainerController] })
export class TrainerModule {}
