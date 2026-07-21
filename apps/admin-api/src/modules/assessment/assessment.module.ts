import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { AuditModule } from '../audit/audit.module';

/** Assessment authoring feature boundary. */
@Module({ imports: [AuditModule], controllers: [AssessmentController] })
export class AssessmentModule {}
