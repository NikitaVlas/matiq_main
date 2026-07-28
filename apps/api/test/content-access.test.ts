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

describe('ContentService access', () => {
  it('allows an administrator to play published content without a subscription', async () => {
    const subscriptions = { requireAccess: vi.fn() };
    const service = new ContentService(
      { video: { findUnique: vi.fn().mockResolvedValue(video) } } as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video.mp4') } as never,
      subscriptions as never,
    );

    await expect(service.playback('admin-1', UserRole.ADMIN, video.id)).resolves.toMatchObject({
      video,
      playbackUrl: 'http://storage/video.mp4',
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
});
