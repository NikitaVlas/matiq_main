import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import { createApp } from '../src/bootstrap';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

const databaseUrl = process.env.DATABASE_URL;
const email = `admin-auth-${Date.now()}@example.de`;

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error(
    'Admin authentication integration tests require a disposable matiq_test database.',
  );
}

describe('Admin API authentication', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let adminCookie: string;
  let athleteCookie: string;
  let userIds: string[];

  beforeAll(async () => {
    const [admin, athlete] = await Promise.all([
      db.user.create({
        data: {
          email,
          passwordHash: 'test-password-hash',
          emailVerifiedAt: new Date(),
          role: 'ADMIN',
          mfaSecretEncrypted: 'encrypted-secret',
          mfaEnabledAt: new Date(),
        },
      }),
      db.user.create({
        data: {
          email: `athlete-${email}`,
          passwordHash: 'test-password-hash',
          emailVerifiedAt: new Date(),
        },
      }),
    ]);
    userIds = [admin.id, athlete.id];
    const createSession = async (userId: string) => {
      const token = randomBytes(32).toString('base64url');
      await db.session.create({
        data: {
          userId,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return `matiq_session=${token}`;
    };
    [adminCookie, athleteCookie] = await Promise.all([
      createSession(admin.id),
      createSession(athlete.id),
    ]);

    const created = await createApp();
    app = created.app;
    vi.spyOn(app.get(DashboardController), 'stats').mockResolvedValue({
      users: 0,
      trainers: 0,
      videos: 0,
      activeAssessmentQuestions: 0,
    });
    await app.init();
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
    await app.close();
  });

  it('keeps the health endpoint public', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok', service: 'admin-api' });
  });

  it('rejects missing and non-administrator sessions', async () => {
    await request(app.getHttpServer()).get('/admin/stats').expect(401);
    await request(app.getHttpServer()).get('/admin/stats').set('Cookie', athleteCookie).expect(401);
  });

  it('allows an MFA-enabled administrator session', async () => {
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Cookie', adminCookie)
      .expect(200, { users: 0, trainers: 0, videos: 0, activeAssessmentQuestions: 0 });
  });
});
