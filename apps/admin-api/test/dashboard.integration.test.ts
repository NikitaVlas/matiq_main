import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

const testPrefix = `dashboard-integration-${Date.now()}`;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.includes('/matiq_test')) {
  throw new Error('Dashboard integration tests require a disposable matiq_test database.');
}

describe('Admin dashboard', () => {
  const db = new PrismaClient();
  const controller = new DashboardController(db);
  let baseline: Awaited<ReturnType<DashboardController['stats']>>;

  beforeAll(async () => {
    baseline = await controller.stats();
    await db.user.createMany({
      data: [
        {
          email: `${testPrefix}-athlete@example.de`,
          passwordHash: 'test-password-hash',
        },
        {
          email: `${testPrefix}-trainer-one@example.de`,
          passwordHash: 'test-password-hash',
          role: 'TRAINER',
        },
        {
          email: `${testPrefix}-trainer-two@example.de`,
          passwordHash: 'test-password-hash',
          role: 'TRAINER',
        },
      ],
    });
    await db.video.create({
      data: {
        title: `${testPrefix} video`,
        storageKey: `${testPrefix}/video.mp4`,
      },
    });
    await db.assessmentQuestion.createMany({
      data: [
        {
          key: `${testPrefix}-active`,
          text: 'Active test question',
          context: 'TOP',
          skillKey: `${testPrefix}-skill`,
          options: [],
        },
        {
          key: `${testPrefix}-inactive`,
          text: 'Inactive test question',
          context: 'BOTTOM',
          skillKey: `${testPrefix}-skill`,
          options: [],
          active: false,
        },
      ],
    });
  });

  afterAll(async () => {
    await db.assessmentQuestion.deleteMany({ where: { key: { startsWith: testPrefix } } });
    await db.video.deleteMany({ where: { title: { startsWith: testPrefix } } });
    await db.user.deleteMany({ where: { email: { startsWith: testPrefix } } });
    await db.$disconnect();
  });

  it('returns aggregate counts from the database', async () => {
    await expect(controller.stats()).resolves.toEqual({
      users: baseline.users + 3,
      trainers: baseline.trainers + 2,
      videos: baseline.videos + 1,
      activeAssessmentQuestions: baseline.activeAssessmentQuestions + 1,
    });
  });
});
