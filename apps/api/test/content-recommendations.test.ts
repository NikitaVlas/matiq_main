import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

function createService(overrides: Record<string, unknown> = {}) {
  const db = {
    lesson: { findUnique: vi.fn().mockResolvedValue(null) },
    videoWatch: { findMany: vi.fn().mockResolvedValue([]) },
    athleteProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    videoMetadataOption: { findMany: vi.fn().mockResolvedValue([]) },
    video: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };
  const subscriptions = { requireAccess: vi.fn() };
  return {
    db,
    subscriptions,
    service: new ContentService(db as never, {} as never, subscriptions as never),
  };
}

describe('ContentService recommendations', () => {
  it('uses the first unfinished Roadmap lesson as the primary recommendation', async () => {
    const roadmapLesson = {
      id: 'lesson-roadmap',
      videoId: 'video-roadmap',
      title: 'Pressure passing',
      published: true,
      video: { id: 'video-roadmap', published: true },
    };
    const { service } = createService({
      athleteProfile: {
        findUnique: vi.fn().mockResolvedValue({
          roadmapItems: [{ title: 'Improve guard passing', skillKey: null, lesson: roadmapLesson }],
        }),
      },
    });

    await expect(
      service.recommendations('athlete-1', UserRole.ATHLETE, 'video-current'),
    ).resolves.toMatchObject({
      primarySource: 'ROADMAP',
      roadmap: { videoId: 'video-roadmap', source: 'ROADMAP' },
    });
  });

  it('falls back to the primary lesson path when no Roadmap candidate exists', async () => {
    const { service } = createService({
      lesson: {
        findUnique: vi.fn().mockResolvedValue({
          outgoingRelations: [
            {
              type: 'BRANCH',
              trigger: { name: 'Opponent sprawls' },
              condition: null,
              toLesson: {
                id: 'lesson-branch',
                videoId: 'video-branch',
                title: 'Branch response',
                published: true,
                video: { published: true },
              },
            },
            {
              type: 'PRIMARY',
              trigger: null,
              condition: null,
              toLesson: {
                id: 'lesson-next',
                videoId: 'video-next',
                title: 'Pressure passing',
                published: true,
                video: { published: true },
              },
            },
          ],
        }),
      },
    });

    await expect(
      service.recommendations('athlete-1', UserRole.ATHLETE, 'video-current'),
    ).resolves.toMatchObject({
      primarySource: 'LESSON_PATH',
      lessonPath: { videoId: 'video-next', source: 'LESSON_PATH' },
    });
  });

  it('matches a Roadmap candidate through the shared Roadmap topic metadata', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'video-half-guard',
      Lesson: { id: 'lesson-half-guard', videoId: 'video-half-guard', title: 'Half Guard' },
    });
    const { service } = createService({
      athleteProfile: {
        findUnique: vi.fn().mockResolvedValue({
          roadmapItems: [{ title: 'Half Guard', skillKey: 'half-guard', lesson: null }],
        }),
      },
      video: { findFirst, findMany: vi.fn().mockResolvedValue([]) },
    });

    await expect(
      service.recommendations('athlete-1', UserRole.ATHLETE, 'video-current'),
    ).resolves.toMatchObject({
      primarySource: 'ROADMAP',
      roadmap: { videoId: 'video-half-guard' },
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              metadataValues: {
                some: { option: { key: 'half-guard', field: { key: 'roadmap-topic' } } },
              },
            },
          ]),
        }),
      }),
    );
  });

  it('does not require a subscription for an administrator', async () => {
    const { service, subscriptions } = createService();
    await service.recommendations('admin-1', UserRole.ADMIN, 'video-current');
    expect(subscriptions.requireAccess).not.toHaveBeenCalled();
  });
});
