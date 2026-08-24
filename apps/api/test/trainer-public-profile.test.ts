import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

describe('public Trainer profiles', () => {
  it('queries only published Trainer profiles without selecting email', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ContentService(
      { trainerProfile: { findMany } } as never,
      {} as never,
      {} as never,
    );

    await service.trainers();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { published: true, user: { deletedAt: null, role: 'TRAINER' } },
      }),
    );
    expect(JSON.stringify(findMany.mock.calls[0]?.[0])).not.toContain('email');
  });

  it('returns published courses and standalone videos under the athlete story', async () => {
    const service = new ContentService(
      {
        trainerProfile: {
          findFirst: vi.fn().mockResolvedValue({
            slug: 'anna-muster',
            displayName: 'Anna Muster',
            athleteJourney: 'A long journey',
            user: {
              authoredCourses: [{ id: 'course-1', title: 'Guard system' }],
              authoredVideos: [{ id: 'video-1', title: 'Competition analysis' }],
            },
          }),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.trainer('anna-muster')).resolves.toMatchObject({
      slug: 'anna-muster',
      courses: [{ id: 'course-1' }],
      videos: [{ id: 'video-1' }],
    });
  });

  it('does not expose an unpublished or unknown slug', async () => {
    const service = new ContentService(
      { trainerProfile: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
      {} as never,
      {} as never,
    );
    await expect(service.trainer('draft-profile')).rejects.toThrow('TRAINER_NOT_FOUND');
  });
});
