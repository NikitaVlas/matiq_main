import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionService } from './application/subscription.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { StripeBillingService } from './infrastructure/stripe-billing.service';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
@Global()
@Module({
  imports: [SharedInfrastructureModule],
  controllers: [SubscriptionController, StripeWebhookController],
  providers: [SubscriptionService, StripeBillingService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
