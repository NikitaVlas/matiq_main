import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

const video = {
  id: 'video-1',
  title: 'Test video',
  published: true,
  storageKey: 'video.mp4',
  position: null,
  technique: null,
  variant: null,
  movement: null,
  drill: null,
  watchEvents: [],
};

const publishedLesson = {
  id: 'lesson-1',
  title: 'Pressure passing',
  goal: 'Stabilise the pass',
  startingPosition: 'Open guard',
  endingPosition: 'Side control',
  level: 'Intermediate',
  giNoGi: 'No-Gi',
  position: 0,
  published: true,
  module: {
    id: 'module-1',
    title: 'Passing system',
    course: { id: 'course-1', title: 'Top Game', discipline: 'NO_GI_GRAPPLING', published: true },
    lessons: [
      {
        id: 'lesson-1',
        videoId: 'video-1',
        title: 'Pressure passing',
        position: 0,
        video: { durationSec: 300, watchEvents: [{ watchedSeconds: 120, completed: false }] },
      },
      {
        id: 'lesson-2',
        videoId: 'video-2',
        title: 'Hold side control',
        position: 1,
        video: { durationSec: 240, watchEvents: [] },
      },
    ],
  },
  outgoingRelations: [
    {
      type: 'BRANCH',
      condition: null,
      trigger: { name: 'Opponent turns in' },
      toLesson: { id: 'lesson-2', videoId: 'video-2', title: 'Hold side control' },
    },
  ],
};

describe('ContentService access', () => {
  it('allows an administrator to play published content without a subscription', async () => {
    const subscriptions = { requireAccess: vi.fn() };
    const service = new ContentService(
      {
        video: { findUnique: vi.fn().mockResolvedValue(video) },
        lesson: { findUnique: vi.fn().mockResolvedValue(publishedLesson) },
      } as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video.mp4') } as never,
      subscriptions as never,
    );

    await expect(service.playback('admin-1', UserRole.ADMIN, video.id)).resolves.toMatchObject({
      video,
      playbackUrl: 'http://storage/video.mp4',
      courseContext: {
        course: { id: 'course-1', title: 'Top Game' },
        module: { id: 'module-1', title: 'Passing system' },
        currentLesson: { id: 'lesson-1' },
        lessons: [
          { id: 'lesson-1', current: true, watchedSeconds: 120, completed: false },
          { id: 'lesson-2', current: false, watchedSeconds: 0, completed: false },
        ],
        continuations: [{ type: 'BRANCH', trigger: 'Opponent turns in' }],
      },
    });
    expect(subscriptions.requireAccess).not.toHaveBeenCalled();
  });

  it('still requires an entitlement for an athlete', async () => {
    const subscriptions = { requireAccess: vi.fn().mockRejectedValue(new Error('required')) };
    const service = new ContentService({} as never, {} as never, subscriptions as never);

    await expect(service.playback('athlete-1', UserRole.ATHLETE, video.id)).rejects.toThrow(
      'required',
    );
  });

  it('keeps standalone playback available without exposing course context', async () => {
    const service = new ContentService(
      {
        video: { findUnique: vi.fn().mockResolvedValue(video) },
        lesson: { findUnique: vi.fn().mockResolvedValue(null) },
      } as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video.mp4') } as never,
      { requireAccess: vi.fn() } as never,
    );

    await expect(service.playback('athlete-1', UserRole.ATHLETE, video.id)).resolves.toMatchObject({
      courseContext: null,
    });
  });
});
