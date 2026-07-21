import { Module } from '@nestjs/common';
import { AssessmentController } from './controllers/assessment.controller';
import { AssessmentService } from './application/assessment.service';
@Module({
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
