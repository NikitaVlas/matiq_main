import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const databaseUrl = process.env.DATABASE_URL;
const webhookSecret = 'whsec_test_signature_secret';

if (!databaseUrl?.includes('/matiq_test'))
  throw new Error('Stripe webhook tests require matiq_test.');

describe('Stripe webhook', () => {
  const db = new PrismaClient();
  const runId = Date.now().toString();
  const providerSubscriptionId = `sub_http_${runId}`;
  let app: INestApplication;
  let userId: string;
  const payload = (id: string) =>
    JSON.stringify({
      id,
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: providerSubscriptionId,
          object: 'subscription',
          status: 'active',
          start_date: 1700000000,
          items: { data: [{ current_period_end: 1700100000 }] },
          customer: 'cus_http_1',
          cancel_at_period_end: false,
          metadata: {},
        },
      },
    });

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const user = await db.user.create({
      data: { email: `stripe-${Date.now()}@example.de`, passwordHash: 'hash' },
    });
    userId = user.id;
    const created = await createApp();
    app = created.app;
    await app.init();
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    await app.close();
  });

  it('verifies a signed webhook and ignores its duplicate', async () => {
    const eventId = `evt_http_${runId}`;
    const body = payload(eventId).replace(
      '"metadata":{}',
      `"metadata":{"matiqUserId":"${userId}"}`,
    );
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: webhookSecret,
    });
    await request(app.getHttpServer())
      .post('/billing/stripe/webhook')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(body)
      .expect(200);
    await request(app.getHttpServer())
      .post('/billing/stripe/webhook')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(body)
      .expect(200);
    await expect(
      db.subscription.findUnique({ where: { providerSubscriptionId } }),
    ).resolves.toBeTruthy();
    expect(await db.paymentWebhookEvent.count({ where: { providerEventId: eventId } })).toBe(
      1,
    );
  });

  it('rejects an invalid signature', async () => {
    await request(app.getHttpServer())
      .post('/billing/stripe/webhook')
      .set('stripe-signature', 'invalid')
      .send(payload('evt_invalid'))
      .expect(400);
  });
});
