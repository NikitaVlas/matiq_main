import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const url = new URL(process.env.DATABASE_URL ?? 'http://missing');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/matiq_test')
  throw new Error('Trial integration requires the local disposable matiq_test database.');

describe('trial HTTP eligibility and concurrency', () => {
  const db = new PrismaClient();
  const email = `trial-${Date.now()}@example.invalid`;
  let app: INestApplication;
  let userId: string;
  let cookie: string[];
  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('Synthetic-password-123', 12),
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;
    app = (await createApp()).app;
    await app.init();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Synthetic-password-123' })
      .expect(201);
    cookie = response.headers['set-cookie'] as unknown as string[];
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
    await app?.close();
  });
  it('rejects anonymous, incomplete and unverified accounts without creating a subscription', async () => {
    await request(app.getHttpServer()).post('/subscription/activate-trial').expect(401);
    await request(app.getHttpServer())
      .post('/subscription/activate-trial')
      .set('Cookie', cookie)
      .expect(403);
    await db.assessment.create({ data: { userId } });
    await request(app.getHttpServer())
      .post('/subscription/activate-trial')
      .set('Cookie', cookie)
      .expect(403);
    await db.assessment.update({ where: { userId }, data: { completedAt: new Date() } });
    await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: null } });
    await request(app.getHttpServer())
      .post('/subscription/activate-trial')
      .set('Cookie', cookie)
      .expect(401);
    expect(await db.subscription.count({ where: { userId } })).toBe(0);
    await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  });
  it('creates one trial under concurrent requests and never renews it on replay', async () => {
    const activate = () =>
      request(app.getHttpServer())
        .post('/subscription/activate-trial')
        .set('Cookie', cookie)
        .expect(201);
    const responses = await Promise.all([activate(), activate(), activate()]);
    expect(new Set(responses.map(({ body }) => body.id)).size).toBe(1);
    expect(await db.subscription.count({ where: { userId } })).toBe(1);
    const original = await db.subscription.findFirstOrThrow({ where: { userId } });
    expect(original.endsAt.getTime() - original.startsAt.getTime()).toBe(604800000);
    await db.subscription.update({ where: { id: original.id }, data: { status: 'EXPIRED' } });
    const replay = await activate();
    expect(replay.body.status).toBe('EXPIRED');
    expect(replay.body.endsAt).toBe(original.endsAt.toISOString());
    expect(await db.subscription.count({ where: { userId } })).toBe(1);
  });
});
