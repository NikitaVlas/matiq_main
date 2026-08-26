import { describe, expect, it, vi } from 'vitest';
import { ADMIN_ROLES_KEY } from '../src/modules/admin-auth/admin-roles.decorator';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

describe('viewing analytics', () => {
  it('is restricted to Admin', () => {
    expect(
      Reflect.getMetadata(ADMIN_ROLES_KEY, DashboardController.prototype.viewingAnalytics),
    ).toEqual(['ADMIN']);
  });

  it('separates paid and trial time without athlete details', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      {
        trainerId: 'trainer-1',
        videoId: 'video-1',
        accessClass: 'PAID',
        _sum: { durationMs: 9000 },
      },
      {
        trainerId: 'trainer-1',
        videoId: 'video-1',
        accessClass: 'TRIAL',
        _sum: { durationMs: 3000 },
      },
    ]);
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'video-1',
        title: 'Guard Retention',
        trainer: { trainerProfile: { displayName: 'Max Mustermann' } },
        Lesson: { module: { course: { id: 'course-1', title: 'Open Guard' } } },
      },
    ]);
    const result = await new DashboardController({
      verifiedWatchInterval: { groupBy },
      video: { findMany },
    } as never).viewingAnalytics();

    expect(result.totals).toEqual({ paidMs: 9000, trialMs: 3000 });
    expect(result.trainers[0]).toMatchObject({
      displayName: 'Max Mustermann',
      paidMs: 9000,
      trialMs: 3000,
    });
    expect(JSON.stringify(result)).not.toContain('userId');
    expect(JSON.stringify(result)).not.toContain('email');
  });
});
