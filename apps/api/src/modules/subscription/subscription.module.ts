import { Module } from '@nestjs/common';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService } from './application/subscription.service';
@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
