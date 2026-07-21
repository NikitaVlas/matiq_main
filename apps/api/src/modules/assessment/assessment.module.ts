import { Module } from '@nestjs/common';
import { AssessmentController } from './controllers/assessment.controller';
import { AssessmentService } from './application/assessment.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
import { SubscriptionModule } from '../subscription';
@Module({
  imports: [SharedInfrastructureModule, IdentityModule, SubscriptionModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
