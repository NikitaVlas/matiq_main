import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';
import { createTotpCode } from '../src/modules/identity/infrastructure/totp';

const databaseUrl = process.env.DATABASE_URL;
const email = `mfa-${Date.now()}@example.de`;
const password = 'SicheresPasswort1';

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('MFA integration tests require a disposable matiq_test database.');
}

describe('privileged-account MFA', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let userId: string;

  beforeAll(async () => {
    process.env.MFA_ENCRYPTION_KEY = 'integration-only-mfa-encryption-key';
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        emailVerifiedAt: new Date(),
        role: 'ADMIN',
      },
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

  it('requires enrollment, then accepts TOTP and consumes recovery codes', async () => {
    const enrollmentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    expect(enrollmentLogin.body).toEqual({ authenticated: true, mfaSetupRequired: true });
    const enrollmentCookie = enrollmentLogin.headers['set-cookie'] as unknown as string[];

    const setup = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Cookie', enrollmentCookie)
      .expect(201);
    const code = createTotpCode(setup.body.secret);
    const confirmation = await request(app.getHttpServer())
      .post('/auth/mfa/confirm')
      .set('Cookie', enrollmentCookie)
      .send({ code })
      .expect(201);
    expect(confirmation.body.recoveryCodes).toHaveLength(10);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, mfaCode: '000000' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, mfaCode: createTotpCode(setup.body.secret) })
      .expect(201, { authenticated: true, mfaSetupRequired: false });

    const recoveryCode = confirmation.body.recoveryCodes[0];
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, mfaCode: recoveryCode })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, mfaCode: recoveryCode })
      .expect(401);
  });
});
