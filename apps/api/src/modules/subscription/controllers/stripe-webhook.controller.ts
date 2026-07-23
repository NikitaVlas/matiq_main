import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { SubscriptionService } from '../application/subscription.service';

@Controller('billing/stripe')
export class StripeWebhookController {
  constructor(@Inject(SubscriptionService) private readonly subscriptions: SubscriptionService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() request: { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key || !secret) throw new ServiceUnavailableException('STRIPE_WEBHOOK_NOT_CONFIGURED');
    if (!signature || !request.rawBody) throw new BadRequestException('INVALID_STRIPE_WEBHOOK');
    let event: Stripe.Event;
    try {
      event = new Stripe(key).webhooks.constructEvent(request.rawBody, signature, secret);
    } catch {
      throw new BadRequestException('INVALID_STRIPE_WEBHOOK');
    }
    await this.subscriptions.processStripeEvent(event);
    return { received: true };
  }
}
