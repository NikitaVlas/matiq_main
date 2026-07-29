import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

function createService(watchedSeconds: number) {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const upsert = vi.fn().mockImplementation(({ create }) => Promise.resolve(create));
  const db = {
    video: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'video-1',
        published: true,
        durationSec: 100,
      }),
    },
    videoWatch: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert,
    },
    roadmapItem: { updateMany },
  };
  const service = new ContentService(db as never, {} as never, { requireAccess: vi.fn() } as never);
  return { service, updateMany, watchedSeconds };
}

describe('Roadmap progress from video viewing', () => {
  it('completes a linked Roadmap step after 80 percent of the video', async () => {
    const { service, updateMany, watchedSeconds } = createService(80);

    await service.recordWatch('athlete-1', UserRole.ATHLETE, 'video-1', watchedSeconds);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        athleteProfile: { userId: 'athlete-1' },
        lesson: { videoId: 'video-1' },
        completedAt: null,
      },
      data: { completedAt: expect.any(Date) },
    });
  });

  it('keeps the Roadmap step active below 80 percent', async () => {
    const { service, updateMany, watchedSeconds } = createService(79);

    await service.recordWatch('athlete-1', UserRole.ATHLETE, 'video-1', watchedSeconds);

    expect(updateMany).not.toHaveBeenCalled();
  });
});
