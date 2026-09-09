import { Module } from '@nestjs/common';
import { AssessmentController } from './controllers/assessment.controller';
import { AssessmentService } from './application/assessment.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
@Module({
  imports: [SharedInfrastructureModule, IdentityModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
