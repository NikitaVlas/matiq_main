import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

describe('registration to athlete profile', () => {
  let app: INestApplication;
  const db = new PrismaClient();
  const email = `integration-${Date.now()}@example.de`;
  let playbackVideoId: string | undefined;
  let publicTrainerId: string | undefined;
  let publicTrainerCourseId: string | undefined;

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'console';
    const created = await createApp();
    app = created.app;
    await app.init();
  });

  afterAll(async () => {
    const identity = await db.user.findUnique({
      where: { email },
      select: {
        emailVerificationTokens: { select: { id: true } },
        passwordResetTokens: { select: { id: true } },
      },
    });
    const emailKeys = [
      ...(identity?.emailVerificationTokens.map(({ id }) => `email:verify_email:${id}`) ?? []),
      ...(identity?.passwordResetTokens.map(({ id }) => `email:reset_password:${id}`) ?? []),
    ];
    const emailEvents = await db.outboxEvent.findMany({
      where: { idempotencyKey: { in: emailKeys } },
      select: { id: true },
    });
    const emailEventIds = emailEvents.map(({ id }) => id);
    await db.deadLetterJob.deleteMany({
      where: { inboxJob: { outboxEventId: { in: emailEventIds } } },
    });
    await db.inboxJob.deleteMany({ where: { outboxEventId: { in: emailEventIds } } });
    await db.outboxEvent.deleteMany({ where: { id: { in: emailEventIds } } });
    await db.user.deleteMany({ where: { email } });
    if (playbackVideoId) await db.video.deleteMany({ where: { id: playbackVideoId } });
    if (publicTrainerCourseId) await db.course.deleteMany({ where: { id: publicTrainerCourseId } });
    if (publicTrainerId) await db.user.deleteMany({ where: { id: publicTrainerId } });
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
    const registeredUser = await db.user.findUniqueOrThrow({ where: { email } });

    const questions = await request(app.getHttpServer())
      .get('/assessment/questions')
      .set('Cookie', cookie)
      .expect(200);
    const draftAnswers = questions.body
      .slice(0, 2)
      .map((question: { key: string; options: { key: string }[] }) => ({
        questionKey: question.key,
        optionKey: question.options[0].key,
      }));
    await request(app.getHttpServer())
      .put('/assessment/draft')
      .set('Cookie', cookie)
      .send({ discipline: 'BJJ_GI', answers: draftAnswers })
      .expect(200);
    const resumedDraft = await request(app.getHttpServer())
      .get('/assessment/attempt/BJJ_GI')
      .set('Cookie', cookie)
      .expect(200);
    expect(resumedDraft.body.status).toBe('DRAFT');
    expect(resumedDraft.body.answers).toHaveLength(2);
    expect(await db.assessment.findUnique({ where: { userId: registeredUser.id } })).toBeNull();
    await request(app.getHttpServer())
      .post('/subscription/activate-trial')
      .set('Cookie', cookie)
      .expect(403);
    expect(await db.subscription.count({ where: { userId: registeredUser.id } })).toBe(0);

    const assessment = await request(app.getHttpServer())
      .post('/assessment/submit')
      .set('Cookie', cookie)
      .send({
        answers: questions.body.map((question: { key: string; options: { key: string }[] }) => ({
          questionKey: question.key,
          optionKey: question.options[0].key,
        })),
      })
      .expect(201);
    expect(assessment.body.completed).toBe(true);
    expect(await db.subscription.count({ where: { userId: registeredUser.id } })).toBe(0);
    expect(assessment.body.roadmap.length).toBeGreaterThan(0);
    const firstAttempts = await db.assessmentAttempt.findMany({
      where: { userId: registeredUser.id, status: 'COMPLETED' },
      include: { evaluations: true },
    });
    expect(firstAttempts).toHaveLength(2);
    expect(firstAttempts[0]?.questionBankVersion).toBe(1);
    expect(firstAttempts[0]?.questionBankSnapshot).toEqual(expect.any(Array));
    expect(firstAttempts[0]?.evaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ confidence: 'SUFFICIENT', score: expect.any(Number) }),
      ]),
    );

    await request(app.getHttpServer())
      .post('/assessment/submit')
      .set('Cookie', cookie)
      .send({
        answers: questions.body.map((question: { key: string; options: { key: string }[] }) => ({
          questionKey: question.key,
          optionKey: question.options.at(-1)?.key,
        })),
      })
      .expect(201);
    expect(
      await db.assessmentAttempt.count({
        where: { userId: registeredUser.id, status: 'COMPLETED' },
      }),
    ).toBe(4);

    const catalog = await request(app.getHttpServer()).get('/content/catalog').expect(200);
    expect(catalog.body[0].positions[0].skillGroups[0].techniques[0].variants.length).toBe(1);

    const publicTrainer = await db.user.create({
      data: {
        email: `trainer-${Date.now()}@example.de`,
        passwordHash: 'integration-not-a-login-secret',
        role: 'TRAINER',
        emailVerifiedAt: new Date(),
        trainerProfile: {
          create: {
            slug: `integration-trainer-${Date.now()}`,
            displayName: 'Integration Athlete',
            biography: 'Ein deutscher BJJ-Athlet mit lokalem Trainingsfokus.',
            athleteJourney: 'Vom ersten Training bis zum eigenen Wettkampfteam.',
            disciplines: ['BJJ_GI'],
            qualifications: ['Black Belt'],
            achievements: ['Regional champion'],
            trainingPrinciples: 'Verstehen, testen, wiederholen.',
            city: 'Berlin',
            languages: ['Deutsch'],
            published: true,
            publishedAt: new Date(),
          },
        },
      },
      include: { trainerProfile: true },
    });
    publicTrainerId = publicTrainer.id;
    const trainerCourse = await db.course.create({
      data: {
        key: `integration-course-${Date.now()}`,
        title: 'Integration Guard Course',
        discipline: 'BJJ_GI',
        published: true,
        trainerId: publicTrainer.id,
      },
    });
    publicTrainerCourseId = trainerCourse.id;
    const publicTrainers = await request(app.getHttpServer()).get('/content/trainers').expect(200);
    expect(publicTrainers.text).not.toContain(publicTrainer.email);
    expect(publicTrainers.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ displayName: 'Integration Athlete' })]),
    );
    await request(app.getHttpServer())
      .get(`/content/trainers/${publicTrainer.trainerProfile?.slug}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          displayName: 'Integration Athlete',
          courses: [{ id: trainerCourse.id, title: trainerCourse.title }],
        });
        expect(JSON.stringify(body)).not.toContain(publicTrainer.email);
      });

    await request(app.getHttpServer())
      .post('/subscription/activate-trial')
      .set('Cookie', cookie)
      .expect(201);
    const playbackVideo = await db.video.create({
      data: {
        title: 'Integration playback',
        storageKey: 'private/integration-playback.mp4',
        durationSec: 100,
        published: true,
        trainerId: publicTrainer.id,
      },
    });
    playbackVideoId = playbackVideo.id;
    const playback = await request(app.getHttpServer())
      .get(`/content/videos/${playbackVideo.id}/playback`)
      .set('Cookie', cookie)
      .expect(200);
    const storedSession = await db.playbackSession.findUniqueOrThrow({
      where: { id: playback.body.playbackSessionId },
    });
    expect(storedSession.tokenHash).not.toBe(playback.body.playbackToken);
    const heartbeat = {
      playbackToken: playback.body.playbackToken,
      idempotencyKey: 'integration-heartbeat-0001',
      sequence: 1,
      previousPositionSec: 0,
      currentPositionSec: 0,
      activePlaybackMs: 0,
      playbackRate: 1,
      visible: true,
      active: true,
      clientAt: new Date().toISOString(),
    };
    await request(app.getHttpServer())
      .post(`/content/videos/${playbackVideo.id}/heartbeat`)
      .set('Cookie', cookie)
      .send(heartbeat)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ accepted: true, processed: true }));
    await request(app.getHttpServer())
      .post(`/content/videos/${playbackVideo.id}/heartbeat`)
      .set('Cookie', cookie)
      .send(heartbeat)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ accepted: true, processed: false }));
    expect(await db.playbackHeartbeat.count({ where: { sessionId: storedSession.id } })).toBe(1);
    expect(
      await db.videoWatch.findUniqueOrThrow({
        where: { videoId_userId: { videoId: playbackVideo.id, userId: registeredUser.id } },
      }),
    ).toMatchObject({ watchedSeconds: 0, completed: false });

    await db.playbackSession.update({
      where: { id: storedSession.id },
      data: { lastHeartbeatAt: new Date(Date.now() - 6000) },
    });
    await request(app.getHttpServer())
      .post(`/content/videos/${playbackVideo.id}/heartbeat`)
      .set('Cookie', cookie)
      .send({
        ...heartbeat,
        idempotencyKey: 'integration-heartbeat-0002',
        sequence: 2,
        currentPositionSec: 5,
        activePlaybackMs: 5000,
      })
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ accepted: true, processed: true }));
    await db.playbackSession.update({
      where: { id: storedSession.id },
      data: { lastHeartbeatAt: new Date(Date.now() - 6000) },
    });
    await request(app.getHttpServer())
      .post(`/content/videos/${playbackVideo.id}/heartbeat`)
      .set('Cookie', cookie)
      .send({
        ...heartbeat,
        idempotencyKey: 'integration-heartbeat-0003',
        sequence: 3,
        previousPositionSec: 2,
        currentPositionSec: 7,
        activePlaybackMs: 5000,
      })
      .expect(201);
    const verifiedIntervals = await db.verifiedWatchInterval.findMany({
      where: { userId: registeredUser.id, videoId: playbackVideo.id },
      orderBy: { startMs: 'asc' },
    });
    expect(
      verifiedIntervals.map(({ startMs, endMs, durationMs, accessClass, trainerId }) => ({
        startMs,
        endMs,
        durationMs,
        accessClass,
        trainerId,
      })),
    ).toEqual([
      {
        startMs: 0,
        endMs: 5000,
        durationMs: 5000,
        accessClass: 'TRIAL',
        trainerId: publicTrainer.id,
      },
      {
        startMs: 5000,
        endMs: 7000,
        durationMs: 2000,
        accessClass: 'TRIAL',
        trainerId: publicTrainer.id,
      },
    ]);

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
