import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { Database } from '../../../shared/infrastructure/database';

@Injectable()
export class StripeBillingService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async checkout(userId: string) {
    const key = process.env.STRIPE_SECRET_KEY;
    const price = process.env.STRIPE_PRICE_ID;
    if (!key || !price) throw new ServiceUnavailableException('BILLING_PROVIDER_NOT_CONFIGURED');
    const stripe = new Stripe(key);
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { matiqUserId: userId },
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/subscription?checkout=success`,
      cancel_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/subscription?checkout=cancelled`,
      metadata: { matiqUserId: userId },
      subscription_data: { metadata: { matiqUserId: userId } },
    });
    if (!session.url) throw new ServiceUnavailableException('CHECKOUT_URL_UNAVAILABLE');
    return { url: session.url };
  }

  async cancelAtPeriodEnd(providerSubscriptionId: string) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException('BILLING_PROVIDER_NOT_CONFIGURED');
    await new Stripe(key).subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async paymentUpdatePortal(providerCustomerId: string) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException('BILLING_PROVIDER_NOT_CONFIGURED');
    const session = await new Stripe(key).billingPortal.sessions.create({
      customer: providerCustomerId,
      return_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/subscription`,
    });
    return { url: session.url };
  }
}
