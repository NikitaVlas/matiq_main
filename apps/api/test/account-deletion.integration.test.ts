import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const databaseUrl = process.env.DATABASE_URL;
const email = `account-deletion-${Date.now()}@example.de`;
const password = 'SicheresPasswort1';

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Account deletion integration tests require a disposable matiq_test database.');
}

describe('account export and deletion', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let cookie: string[];
  let userId: string;

  beforeAll(async () => {
    const user = await db.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date() },
    });
    userId = user.id;
    const created = await createApp();
    app = created.app;
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    cookie = login.headers['set-cookie'] as unknown as string[];
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    await app.close();
  });

  it('exports data and requires recent re-authentication before deletion', async () => {
    const exported = await request(app.getHttpServer())
      .get('/auth/account/export')
      .set('Cookie', cookie)
      .expect(200);
    expect(exported.body.account.email).toBe(email);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/reauthenticate')
      .set('Cookie', cookie)
      .send({ password })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(200, { accepted: true });

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);
    const deleted = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(deleted.email).toBe(`deleted-${userId}@deleted.invalid`);
    expect(deleted.deletedAt).toBeTruthy();
    await expect(
      db.auditLog.findFirst({ where: { action: 'ACCOUNT_DELETE', entityId: userId } }),
    ).resolves.toBeTruthy();
  });
});
