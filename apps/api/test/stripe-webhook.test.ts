import { describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from '../src/modules/subscription/application/subscription.service';

const event = {
  id: 'evt_1',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_1',
      status: 'active',
      start_date: 1_700_000_000,
      items: { data: [{ current_period_end: 1_700_100_000 }] },
      customer: 'cus_1',
      cancel_at_period_end: false,
      metadata: { matiqUserId: 'user_1' },
    },
  },
};

describe('Stripe webhook processing', () => {
  it('records an event once and creates an active subscription', async () => {
    const db = {
      paymentWebhookEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscription: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const service = new SubscriptionService(db as never, {} as never);
    await service.processStripeEvent(event as never);
    expect(db.subscription.upsert).toHaveBeenCalledOnce();
    expect(db.paymentWebhookEvent.update).toHaveBeenCalledOnce();
  });

  it('does not process a duplicate provider event', async () => {
    const db = { paymentWebhookEvent: { findUnique: vi.fn().mockResolvedValue({ id: 'seen' }) } };
    const service = new SubscriptionService(db as never, {} as never);
    await service.processStripeEvent(event as never);
    expect(db.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({ where: { providerEventId: 'evt_1' } });
  });
});
