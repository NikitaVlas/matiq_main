import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSignedUrl } = vi.hoisted(() => ({
  getSignedUrl: vi.fn().mockResolvedValue('http://storage.local/signed-video'),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));

import { VideoStorageService } from '../src/modules/content/infrastructure/video-storage.service';

describe('VideoStorageService', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  it('creates a local signed URL that expires after five minutes', async () => {
    const service = new VideoStorageService();

    await expect(service.playbackUrl('private/video.mp4')).resolves.toBe(
      'http://storage.local/signed-video',
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({ Key: 'private/video.mp4' }) }),
      { expiresIn: 300 },
    );
  });

  it('does not expose the local storage adapter in production', () => {
    process.env.NODE_ENV = 'production';
    const service = new VideoStorageService();

    expect(() => service.playbackUrl('private/video.mp4')).toThrow(
      'PRODUCTION_VIDEO_PROVIDER_REQUIRED',
    );
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
