import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const databaseUrl = process.env.DATABASE_URL;
const email = `account-session-${Date.now()}@example.de`;
const otherEmail = `other-${email}`;
const initialPassword = 'SicheresPasswort1';
const updatedPassword = 'NeuesSicheresPasswort2';

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Account session integration tests require a disposable matiq_test database.');
}

describe('account session lifecycle', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let firstCookie: string[];

  beforeAll(async () => {
    await db.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(initialPassword, 12),
        emailVerifiedAt: new Date(),
      },
    });
    const created = await createApp();
    app = created.app;
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: initialPassword })
      .expect(201);
    firstCookie = login.headers['set-cookie'] as unknown as string[];
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await db.$disconnect();
    await app.close();
  });

  it('lists, revokes, re-authenticates, and rotates account sessions', async () => {
    const secondLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: initialPassword })
      .expect(201);
    const secondCookie = secondLogin.headers['set-cookie'] as unknown as string[];

    const otherUser = await db.user.create({
      data: {
        email: otherEmail,
        passwordHash: await bcrypt.hash(initialPassword, 12),
        emailVerifiedAt: new Date(),
      },
    });
    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, password: initialPassword })
      .expect(201);
    const otherCookie = otherLogin.headers['set-cookie'] as unknown as string[];
    const foreignSession = await db.session.findFirstOrThrow({ where: { userId: otherUser.id } });

    await request(app.getHttpServer())
      .delete(`/auth/sessions/${foreignSession.id}`)
      .set('Cookie', firstCookie)
      .expect(400);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', otherCookie).expect(200);

    const adminCookieOnly = firstCookie.map((value) =>
      value.replace('matiq_session=', 'matiq_admin_session='),
    );
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', adminCookieOnly).expect(401);

    const sessions = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Cookie', firstCookie)
      .expect(200);
    expect(sessions.body).toHaveLength(2);
    const otherSession = sessions.body.find((session: { current: boolean }) => !session.current);
    expect(otherSession).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/auth/sessions/${otherSession.id}`)
      .set('Cookie', firstCookie)
      .expect(200, { revoked: true });
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', secondCookie).expect(401);

    await request(app.getHttpServer())
      .post('/auth/reauthenticate')
      .set('Cookie', firstCookie)
      .send({ password: initialPassword })
      .expect(201, { reauthenticated: true });

    const changed = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', firstCookie)
      .send({ currentPassword: initialPassword, password: updatedPassword })
      .expect(201, { changed: true });
    const updatedCookie = changed.headers['set-cookie'] as unknown as string[];

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', firstCookie).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', updatedCookie).expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: initialPassword })
      .expect(401);
  });
});
