import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

describe('registration to athlete profile', () => {
  let app: INestApplication;
  const db = new PrismaClient();
  const email = `integration-${Date.now()}@example.de`;

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const created = await createApp();
    app = created.app;
    await app.init();
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
    await app.close();
  });

  it('covers registration, verification, login, reset, profile, and session revocation', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'SicheresPasswort1' })
      .expect(201);

    const verification = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registration.body.developmentToken })
      .expect(201);

    const cookie = verification.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toContain('matiq_session=');

    const profile = await request(app.getHttpServer())
      .put('/athlete-profile')
      .set('Cookie', cookie)
      .send({
        disciplines: ['BJJ_GI', 'NO_GI_GRAPPLING'],
        belt: 'WHITE',
        experienceYears: 1,
        trainingSessionsPerWeek: 3,
        competitionExperience: false,
        goals: ['GENERAL_DEVELOPMENT'],
      })
      .expect(200);

    expect(profile.body.completedAt).toBeTruthy();

    await request(app.getHttpServer()).post('/auth/logout-all').set('Cookie', cookie).expect(201);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'SicheresPasswort1' })
      .expect(201);
    const loginCookie = login.headers['set-cookie'] as unknown as string[];

    const resetRequest = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: resetRequest.body.developmentToken, password: 'NeuesSicheresPasswort2' })
      .expect(201);

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', loginCookie).expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NeuesSicheresPasswort2' })
      .expect(201);
  });

  it('does not reveal whether a reset email exists', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: `missing-${Date.now()}@example.de` })
      .expect(201, { accepted: true });
  });
});
