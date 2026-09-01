import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { decryptTransactionalEmail, type EncryptedEmailEnvelope } from '@matiq/backend';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

describe('Identity transactional email outbox', () => {
  const db = new PrismaClient();
  const email = `email-outbox-${Date.now()}@example.de`;
  let app: INestApplication;
  let userId = '';
  const eventIds: string[] = [];

  beforeAll(async () => {
    app = (await createApp()).app;
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await db.deadLetterJob.deleteMany({
      where: { inboxJob: { outboxEventId: { in: eventIds } } },
    });
    await db.inboxJob.deleteMany({ where: { outboxEventId: { in: eventIds } } });
    await db.outboxEvent.deleteMany({ where: { id: { in: eventIds } } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    await app.close();
  }, 30_000);

  it('atomically stores registration token and encrypted email event', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'SicheresPasswort1' })
      .expect(201);
    userId = response.body.userId;

    const token = await db.emailVerificationToken.findFirstOrThrow({ where: { userId } });
    const event = await db.outboxEvent.findUniqueOrThrow({
      where: { idempotencyKey: `email:verify_email:${token.id}` },
    });
    eventIds.push(event.id);
    const serialized = JSON.stringify(event.payload);
    expect(event.topic).toBe('email.send.v1');
    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(response.body.developmentToken);
    expect(decryptTransactionalEmail(event.payload as EncryptedEmailEnvelope)).toMatchObject({
      kind: 'VERIFY_EMAIL',
      to: email,
    });
  });

  it('stores password reset and its email event in one transaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);
    const token = await db.passwordResetToken.findFirstOrThrow({ where: { userId } });
    const event = await db.outboxEvent.findUniqueOrThrow({
      where: { idempotencyKey: `email:reset_password:${token.id}` },
    });
    eventIds.push(event.id);
    expect(decryptTransactionalEmail(event.payload as EncryptedEmailEnvelope)).toMatchObject({
      kind: 'RESET_PASSWORD',
      to: email,
    });
    expect(response.body.developmentToken).toBeTruthy();
  });

  it('replaces the verification token and enqueues a new encrypted event', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email })
      .expect(201);
    const token = await db.emailVerificationToken.findFirstOrThrow({ where: { userId } });
    const event = await db.outboxEvent.findUniqueOrThrow({
      where: { idempotencyKey: `email:verify_email:${token.id}` },
    });
    eventIds.push(event.id);
    expect(decryptTransactionalEmail(event.payload as EncryptedEmailEnvelope)).toMatchObject({
      kind: 'VERIFY_EMAIL',
      to: email,
    });
    expect(response.body.developmentToken).toBeTruthy();
  });
});
