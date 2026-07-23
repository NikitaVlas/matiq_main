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
    expect(db.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
      where: { providerEventId: 'evt_1' },
    });
  });

  it('starts a three-day grace period after a failed renewal', async () => {
    const db = {
      paymentWebhookEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscription: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const service = new SubscriptionService(db as never, {} as never);
    await service.processStripeEvent({
      ...event,
      id: 'evt_past_due',
      data: { object: { ...event.data.object, status: 'past_due' } },
    } as never);
    const upsertData = db.subscription.upsert.mock.calls[0][0];
    expect(upsertData.create.graceEndsAt).toBeInstanceOf(Date);
    expect(upsertData.create.graceEndsAt.getTime()).toBeGreaterThan(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    );
    expect(upsertData.update.graceEndsAt).toBeInstanceOf(Date);
  });

  it('keeps access only while the past-due grace period is active', async () => {
    const subscription = {
      id: 'subscription_1',
      status: 'PAST_DUE',
      endsAt: new Date(Date.now() - 60_000),
      graceEndsAt: new Date(Date.now() + 60_000),
      updatedAt: new Date(),
    };
    const db = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(subscription),
        update: vi.fn(),
      },
    };
    const service = new SubscriptionService(db as never, {} as never);
    await expect(service.current('user_1')).resolves.toMatchObject({
      status: 'PAST_DUE',
      hasAccess: true,
    });
    expect(db.subscription.update).not.toHaveBeenCalled();

    subscription.graceEndsAt = new Date(Date.now() - 60_000);
    await expect(service.current('user_1')).resolves.toMatchObject({
      status: 'EXPIRED',
      hasAccess: false,
    });
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: 'subscription_1' },
      data: { status: 'EXPIRED' },
    });
  });

  it('opens a payment-update portal only for a past-due customer', async () => {
    const db = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ providerCustomerId: 'cus_1' }),
      },
    };
    const stripe = {
      paymentUpdatePortal: vi.fn().mockResolvedValue({ url: 'https://stripe.test' }),
    };
    const service = new SubscriptionService(db as never, stripe as never);
    await expect(service.paymentUpdatePortal('user_1')).resolves.toEqual({
      url: 'https://stripe.test',
    });
    expect(stripe.paymentUpdatePortal).toHaveBeenCalledWith('cus_1');
    expect(db.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        status: 'PAST_DUE',
        providerCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
