import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

function createService(watchedSeconds: number, completed = false) {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const upsert = vi
    .fn()
    .mockImplementation(({ create, update }) => Promise.resolve(completed ? update : create));
  const db = {
    video: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'video-1',
        published: true,
        durationSec: 100,
      }),
    },
    videoWatch: {
      findUnique: vi
        .fn()
        .mockResolvedValue(completed ? { watchedSeconds: 80, completed: true } : null),
      upsert,
    },
    videoMetadataOption: { findMany: vi.fn().mockResolvedValue([]) },
    roadmapItem: { updateMany, findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  };
  const service = new ContentService(db as never, {} as never, { requireAccess: vi.fn() } as never);
  return { service, updateMany, watchedSeconds };
}

describe('Roadmap progress from video viewing', () => {
  it('completes a linked Roadmap step after 80 percent of the video', async () => {
    const { service, updateMany, watchedSeconds } = createService(80);

    const result = await service.recordWatch(
      'athlete-1',
      UserRole.ATHLETE,
      'video-1',
      watchedSeconds,
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        athleteProfile: { userId: 'athlete-1' },
        lesson: { videoId: 'video-1' },
        completedAt: null,
        OR: [{ isAddedByUser: true }, { skillKey: null }],
      },
      data: { completedAt: expect.any(Date) },
    });
    expect(result).toMatchObject({
      completed: true,
      newlyCompleted: true,
      roadmapItemsCompleted: 1,
    });
  });

  it('keeps the Roadmap step active below 80 percent', async () => {
    const { service, updateMany, watchedSeconds } = createService(79);

    await service.recordWatch('athlete-1', UserRole.ATHLETE, 'video-1', watchedSeconds);

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not repeat the Roadmap mutation after completion', async () => {
    const { service, updateMany } = createService(90, true);

    const result = await service.recordWatch('athlete-1', UserRole.ATHLETE, 'video-1', 90);

    expect(updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      completed: true,
      newlyCompleted: false,
      roadmapItemsCompleted: 0,
    });
  });

  it('rejects non-finite watch progress', async () => {
    const { service } = createService(Number.NaN);

    await expect(
      service.recordWatch('athlete-1', UserRole.ATHLETE, 'video-1', Number.NaN),
    ).rejects.toThrow('INVALID_WATCH_PROGRESS');
  });
});
