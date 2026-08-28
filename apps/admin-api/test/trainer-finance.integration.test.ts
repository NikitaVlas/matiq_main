import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`;

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Trainer finance integration tests require a disposable matiq_test database.');
}

describe('Trainer finance lifecycle', () => {
  const db = new PrismaClient();
  let app: INestApplication;
  let firstAdminId: string;
  let secondAdminId: string;
  let trainerId: string;
  let athleteId: string;
  let editorCookie: string;
  let firstAdminCookie: string;
  let secondAdminCookie: string;
  let staleAdminCookie: string;
  let videoId: string;

  beforeAll(async () => {
    const [firstAdmin, secondAdmin, staleAdmin, editor, trainer, athlete] = await Promise.all([
      createUser('ADMIN', 'admin-one'),
      createUser('ADMIN', 'admin-two'),
      createUser('ADMIN', 'admin-stale'),
      createUser('EDITOR', 'editor'),
      createUser('TRAINER', 'trainer'),
      createUser('ATHLETE', 'athlete'),
    ]);
    firstAdminId = firstAdmin.id;
    secondAdminId = secondAdmin.id;
    trainerId = trainer.id;
    athleteId = athlete.id;
    [firstAdminCookie, secondAdminCookie, staleAdminCookie, editorCookie] = await Promise.all([
      createSession(firstAdmin.id, new Date()),
      createSession(secondAdmin.id, new Date()),
      createSession(staleAdmin.id, new Date(Date.now() - 16 * 60 * 1000)),
      createSession(editor.id, new Date()),
    ]);
    const video = await db.video.create({
      data: {
        title: `Finance integration ${runId}`,
        storageKey: `test/finance-${runId}.mp4`,
        published: true,
        trainerId,
      },
    });
    videoId = video.id;
    await createVerifiedInterval('PAID', 6_000, 1);
    await createVerifiedInterval('TRIAL', 4_000, 2);
    const created = await createApp();
    app = created.app;
    await app.init();
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { actor: { in: [firstAdminId, secondAdminId] } } });
    await db.trainerPayoutReport.deleteMany({ where: { trainerId } });
    await db.trainerSettlementPeriod.deleteMany({ where: { month: '2099-01' } });
    await db.trainerAgreement.deleteMany({ where: { trainerId } });
    await db.video.deleteMany({ where: { id: videoId } });
    await db.user.deleteMany({ where: { email: { endsWith: `-${runId}@example.de` } } });
    await app?.close();
    await db.$disconnect();
  });

  it('enforces roles and recent reauthentication for financial mutations', async () => {
    await request(app.getHttpServer())
      .get('/admin/trainer-finance')
      .set('Cookie', editorCookie)
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/trainer-finance/agreements')
      .set('Cookie', staleAdminCookie)
      .send(agreementInput())
      .expect(401, {
        message: 'REAUTHENTICATION_REQUIRED',
        error: 'Unauthorized',
        statusCode: 401,
      });
  });

  it('runs agreement, settlement, dual approval, and payment as one audited lifecycle', async () => {
    const agreement = await request(app.getHttpServer())
      .post('/admin/trainer-finance/agreements')
      .set('Cookie', firstAdminCookie)
      .send(agreementInput())
      .expect(201);
    await request(app.getHttpServer())
      .post(`/admin/trainer-finance/agreements/${agreement.body.id}/activate`)
      .set('Cookie', firstAdminCookie)
      .expect(201);

    const period = await request(app.getHttpServer())
      .post('/admin/trainer-finance/periods')
      .set('Cookie', firstAdminCookie)
      .send({
        month: '2099-01',
        grossRevenueCents: 1_000_000,
        vatCents: 150_000,
        refundsCents: 20_000,
        chargebacksCents: 10_000,
        providerFeesCents: 20_000,
      });
    expect(period.status, JSON.stringify(period.body)).toBe(201);

    expect(period.body).toMatchObject({
      month: '2099-01',
      netRevenueCents: 800_000,
      distributablePoolCents: 240_000,
      totalPaidWatchMs: '6000',
      totalTrialWatchMs: '4000',
    });
    const [report] = period.body.reports;
    expect(report).toMatchObject({
      trainerId,
      agreementId: agreement.body.id,
      paidWatchMs: '6000',
      trialWatchMs: '4000',
      poolShareCents: 240_000,
      fixedFeeCents: 10_000,
      payableCents: 250_000,
    });

    await transition(report.id, firstAdminCookie, { status: 'REVIEWED' }).expect(201);
    await transition(report.id, firstAdminCookie, { status: 'APPROVED' }).expect(400, {
      message: 'SECOND_ADMIN_APPROVAL_REQUIRED',
      error: 'Bad Request',
      statusCode: 400,
    });
    await transition(report.id, secondAdminCookie, { status: 'APPROVED' }).expect(201);
    const paid = await transition(report.id, firstAdminCookie, {
      status: 'PAID',
      externalPaymentReference: `BANK-${runId}`,
    }).expect(201);
    expect(paid.body).toMatchObject({
      status: 'PAID',
      reviewedByAdminId: firstAdminId,
      approvedByAdminId: secondAdminId,
      paidByAdminId: firstAdminId,
      externalPaymentReference: `BANK-${runId}`,
    });

    const auditActions = await db.auditLog.findMany({
      where: {
        actor: { in: [firstAdminId, secondAdminId] },
        entityId: { in: [agreement.body.id, report.id] },
      },
      select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'TRAINER_AGREEMENT_CREATED',
        'TRAINER_AGREEMENT_ACTIVATED',
        'TRAINER_PAYOUT_STATUS_CHANGED',
      ]),
    );
  });

  function agreementInput() {
    return {
      trainerId,
      validFrom: '2099-01-01T00:00:00.000Z',
      validUntil: '2099-02-01T00:00:00.000Z',
      participatesInPool: true,
      fixedFeeCents: 10_000,
      specialTerms: 'Integration test agreement',
    };
  }

  function transition(reportId: string, cookie: string, body: Record<string, string>) {
    return request(app.getHttpServer())
      .post(`/admin/trainer-finance/reports/${reportId}/status`)
      .set('Cookie', cookie)
      .send(body);
  }

  async function createUser(role: 'ADMIN' | 'EDITOR' | 'TRAINER' | 'ATHLETE', label: string) {
    return db.user.create({
      data: {
        email: `${label}-${runId}@example.de`,
        passwordHash: 'test-password-hash',
        emailVerifiedAt: new Date(),
        role,
        ...(role === 'ADMIN' || role === 'EDITOR'
          ? { mfaSecretEncrypted: 'encrypted-secret', mfaEnabledAt: new Date() }
          : {}),
      },
    });
  }

  async function createSession(userId: string, reauthenticatedAt: Date) {
    const token = randomBytes(32).toString('base64url');
    await db.session.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        reauthenticatedAt,
      },
    });
    return `matiq_admin_session=${token}`;
  }

  async function createVerifiedInterval(
    accessClass: 'PAID' | 'TRIAL',
    durationMs: number,
    sequence: number,
  ) {
    const session = await db.playbackSession.create({
      data: {
        userId: athleteId,
        videoId,
        tokenHash: createHash('sha256').update(`${accessClass}-${runId}`).digest('hex'),
        watermarkId: `${accessClass}-${runId}`,
        expiresAt: new Date('2099-01-20T00:00:00.000Z'),
        accessClass,
        status: 'CLOSED',
        closedAt: new Date('2099-01-15T12:01:00.000Z'),
      },
    });
    const heartbeat = await db.playbackHeartbeat.create({
      data: {
        sessionId: session.id,
        idempotencyKey: `${accessClass}-${runId}`,
        sequence,
        previousPositionSec: 0,
        currentPositionSec: durationMs / 1000,
        activePlaybackMs: durationMs,
        playbackRate: 1,
        visible: true,
        active: true,
        clientAt: new Date('2099-01-15T12:00:00.000Z'),
        accepted: true,
        creditedPositionSec: durationMs / 1000,
      },
    });
    await db.verifiedWatchInterval.create({
      data: {
        userId: athleteId,
        videoId,
        trainerId,
        sessionId: session.id,
        heartbeatId: heartbeat.id,
        accessClass,
        startMs: 0,
        endMs: durationMs,
        durationMs,
        createdAt: new Date('2099-01-15T12:00:00.000Z'),
      },
    });
  }
});
