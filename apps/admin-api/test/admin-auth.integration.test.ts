import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
  let editorCookie: string;
  let userIds: string[];
  let secondAdminId: string;

  beforeAll(async () => {
    const [admin, athlete, secondAdmin, editor] = await Promise.all([
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
      db.user.create({
        data: {
          email: `second-${email}`,
          passwordHash: 'test-password-hash',
          emailVerifiedAt: new Date(),
          role: 'ADMIN',
          mfaSecretEncrypted: 'encrypted-secret',
          mfaEnabledAt: new Date(),
        },
      }),
      db.user.create({
        data: {
          email: `editor-${email}`,
          passwordHash: 'test-password-hash',
          emailVerifiedAt: new Date(),
          role: 'EDITOR',
          mfaSecretEncrypted: 'encrypted-secret',
          mfaEnabledAt: new Date(),
        },
      }),
    ]);
    userIds = [admin.id, athlete.id, secondAdmin.id, editor.id];
    secondAdminId = secondAdmin.id;
    const createSession = async (userId: string) => {
      const token = randomBytes(32).toString('base64url');
      await db.session.create({
        data: {
          userId,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return `matiq_admin_session=${token}`;
    };
    [adminCookie, athleteCookie, editorCookie] = await Promise.all([
      createSession(admin.id),
      createSession(athlete.id),
      createSession(editor.id),
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

  it('changes roles and writes an audit event with the authenticated actor', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${secondAdminId}/role`)
      .set('Cookie', adminCookie)
      .send({ role: 'EDITOR' })
      .expect(200, { id: secondAdminId, role: 'EDITOR' });
    await expect(
      db.auditLog.findFirst({
        where: { action: 'USER_ROLE_CHANGED', entityId: secondAdminId, actor: userIds[0] },
      }),
    ).resolves.toBeTruthy();
  });

  it('allows an Editor to access editorial routes but not administrator routes', async () => {
    await request(app.getHttpServer())
      .get('/admin/assessment/questions')
      .set('Cookie', editorCookie)
      .expect(200);
    await request(app.getHttpServer()).get('/admin/stats').set('Cookie', editorCookie).expect(401);
    await request(app.getHttpServer()).get('/admin/users').set('Cookie', editorCookie).expect(401);
  });
});
