import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService } from './application/subscription.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
@Global()
@Module({
  imports: [SharedInfrastructureModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
