import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { accountExportExpiresAt, encryptAccountExport } from '@matiq/backend';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const databaseUrl = process.env.DATABASE_URL;
const email = `account-deletion-${Date.now()}@example.de`;
const password = 'SicheresPasswort1';
const exportKey = Buffer.alloc(32, 5);
process.env.ACCOUNT_EXPORT_ENCRYPTION_KEY = exportKey.toString('base64');

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Account deletion integration tests require a disposable matiq_test database.');
}

describe('account export and deletion', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let cookie: string[];
  let userId: string;
  let deletionRequestId: string | undefined;
  let deletionSubjectRef: string | undefined;
  let exportRequestId: string | undefined;

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
    if (exportRequestId) {
      const exportEvent = await db.outboxEvent.findUnique({
        where: { idempotencyKey: `account-export:${exportRequestId}` },
        include: { inboxJob: { include: { deadLetter: true } } },
      });
      if (exportEvent?.inboxJob?.deadLetter)
        await db.deadLetterJob.delete({ where: { id: exportEvent.inboxJob.deadLetter.id } });
      if (exportEvent?.inboxJob)
        await db.inboxJob.delete({ where: { id: exportEvent.inboxJob.id } });
      if (exportEvent) await db.outboxEvent.delete({ where: { id: exportEvent.id } });
      await db.accountExportRequest.deleteMany({ where: { id: exportRequestId } });
    }
    if (deletionRequestId) {
      const event = await db.outboxEvent.findUnique({
        where: { idempotencyKey: `privacy.account-delete.v1:${deletionRequestId}` },
        include: { inboxJob: { include: { deadLetter: true } } },
      });
      if (event?.inboxJob?.deadLetter) {
        await db.deadLetterJob.delete({ where: { id: event.inboxJob.deadLetter.id } });
      }
      if (event?.inboxJob) await db.inboxJob.delete({ where: { id: event.inboxJob.id } });
      if (event) await db.outboxEvent.delete({ where: { id: event.id } });
      await db.accountDeletionRequest.deleteMany({ where: { id: deletionRequestId } });
    }
    if (deletionSubjectRef) {
      await db.deletionTombstone.deleteMany({ where: { subjectRef: deletionSubjectRef } });
    }
    await db.$executeRaw`DELETE FROM "AccountDeletionSchedule" WHERE "userId" = ${userId}`;
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    await app.close();
  });

  it('exports data and requires recent re-authentication before deletion', async () => {
    await request(app.getHttpServer()).get('/auth/account/deletion-schedule').expect(401);
    await request(app.getHttpServer())
      .post('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(401);
    await request(app.getHttpServer())
      .delete('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .expect(401);
    const exported = await request(app.getHttpServer())
      .get('/auth/account/export')
      .set('Cookie', cookie)
      .expect(200);
    expect(exported.body.account.email).toBe(email);
    expect(exported.body.schemaVersion).toBe(1);
    expect(JSON.stringify(exported.body)).not.toContain('passwordHash');
    expect(JSON.stringify(exported.body)).not.toContain('tokenHash');

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/account/exports')
      .set('Cookie', cookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/reauthenticate')
      .set('Cookie', cookie)
      .send({ password })
      .expect(201);

    const exportRequest = await request(app.getHttpServer())
      .post('/auth/account/exports')
      .set('Cookie', cookie)
      .expect(201);
    exportRequestId = exportRequest.body.requestId as string;
    expect(exportRequest.body.downloadToken).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get(`/auth/account/exports/${exportRequestId}`)
      .set('Cookie', cookie)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('PENDING'));
    const encrypted = encryptAccountExport({ schemaVersion: 1, account: { email } }, exportKey);
    const completedAt = new Date();
    await db.accountExportRequest.update({
      where: { id: exportRequestId },
      data: {
        ...encrypted,
        status: 'READY',
        completedAt,
        expiresAt: accountExportExpiresAt(completedAt),
      },
    });
    await request(app.getHttpServer())
      .post(`/auth/account/exports/${exportRequestId}/download`)
      .set('Cookie', cookie)
      .send({ downloadToken: 'x'.repeat(43) })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/auth/account/exports/${exportRequestId}/download`)
      .set('Cookie', cookie)
      .send({ downloadToken: exportRequest.body.downloadToken })
      .expect(201)
      .expect(({ body }) => expect(body.account.email).toBe(email));
    await request(app.getHttpServer())
      .post(`/auth/account/exports/${exportRequestId}/download`)
      .set('Cookie', cookie)
      .send({ downloadToken: exportRequest.body.downloadToken })
      .expect(409);

    await db.subscription.create({
      data: { userId, status: 'ACTIVE', endsAt: new Date(Date.now() + 86_400_000) },
    });
    await request(app.getHttpServer())
      .post('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .send({ confirmation: 'wrong' })
      .expect(400);
    const planned = await request(app.getHttpServer())
      .post('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(201);
    expect(planned.body).toMatchObject({
      scheduled: true,
      renewalConfirmed: true,
      executeAt: expect.any(String),
    });
    expect(Object.keys(planned.body).sort()).toEqual([
      'executeAt',
      'renewalConfirmed',
      'scheduled',
    ]);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);
    const duplicate = await request(app.getHttpServer())
      .post('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(201);
    expect(duplicate.body).toEqual(planned.body);
    await request(app.getHttpServer())
      .delete('/auth/account/deletion-schedule')
      .set('Cookie', cookie)
      .expect(200)
      .expect(({ body }) => expect(body.scheduled).toBe(false));
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).deletedAt).toBeNull();

    const deletion = await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Cookie', cookie)
      .send({ confirmation: 'DELETE' })
      .expect(200);
    expect(deletion.body).toMatchObject({
      accepted: true,
      requestId: expect.any(String),
      statusToken: expect.any(String),
      statusTokenExpiresAt: expect.any(String),
    });
    deletionRequestId = deletion.body.requestId;

    await request(app.getHttpServer())
      .post('/auth/account-deletion/status')
      .send({ requestId: deletionRequestId, statusToken: 'incorrect-status-token-value-00000000' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/auth/account-deletion/status')
      .send({ requestId: deletionRequestId, statusToken: deletion.body.statusToken })
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'PENDING' }));

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);
    const deleted = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(deleted.email).toMatch(/^deleted-.+@deleted\.invalid$/);
    expect(deleted.deletedAt).toBeTruthy();
    await expect(
      db.auditLog.findFirst({ where: { action: 'ACCOUNT_DELETE_REQUESTED' } }),
    ).resolves.toBeTruthy();
    const deletionRequest = await db.accountDeletionRequest.findFirstOrThrow({ where: { userId } });
    deletionSubjectRef = deletionRequest.subjectRef;
    await expect(
      db.outboxEvent.findUnique({
        where: { idempotencyKey: `privacy.account-delete.v1:${deletionRequestId}` },
      }),
    ).resolves.toMatchObject({ topic: 'privacy.account-delete.v1' });
    await db.accountDeletionRequest.update({
      where: { id: deletionRequestId },
      data: { completedAt: new Date(), userId: null },
    });
    const completed = await request(app.getHttpServer())
      .post('/auth/account-deletion/status')
      .send({ requestId: deletionRequestId, statusToken: deletion.body.statusToken })
      .expect(201);
    expect(completed.body.status).toBe('COMPLETED');
    expect(completed.body).not.toHaveProperty('userId');
    expect(completed.body).not.toHaveProperty('statusTokenHash');
    await db.accountDeletionRequest.update({
      where: { id: deletionRequestId },
      data: { statusTokenExpiresAt: new Date(0) },
    });
    const expired = await request(app.getHttpServer())
      .post('/auth/account-deletion/status')
      .send({ requestId: deletionRequestId, statusToken: deletion.body.statusToken })
      .expect(404);
    const missing = await request(app.getHttpServer())
      .post('/auth/account-deletion/status')
      .send({ requestId: 'missing-request', statusToken: deletion.body.statusToken })
      .expect(404);
    expect(expired.body).toEqual(missing.body);
  });
});
