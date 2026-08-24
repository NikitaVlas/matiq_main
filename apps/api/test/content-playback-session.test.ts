import { PlaybackSessionStatus, UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

const video = {
  id: 'video-1',
  title: 'Guard retention',
  description: null,
  published: true,
  storageKey: 'private/video-1.mp4',
  durationSec: 100,
  position: null,
  technique: null,
  variant: null,
  movement: null,
  drill: null,
  watchEvents: [],
};

function playbackDatabase() {
  let createdSession: Record<string, unknown> | undefined;
  const db = {
    video: { findUnique: vi.fn().mockResolvedValue(video) },
    lesson: { findUnique: vi.fn().mockResolvedValue(null) },
    playbackSession: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockImplementation(({ data }) => {
        createdSession = data;
        return Promise.resolve({ id: 'session-1', ...data });
      }),
    },
  };
  Object.assign(db, { $transaction: (run: (tx: typeof db) => unknown) => run(db) });
  return { db, createdSession: () => createdSession };
}

describe('ContentService playback sessions', () => {
  it('revokes an earlier full session and stores only a token hash', async () => {
    const { db, createdSession } = playbackDatabase();
    const service = new ContentService(
      db as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video-1') } as never,
      { requireAccess: vi.fn() } as never,
    );

    const result = await service.playback('athlete-1', UserRole.ATHLETE, video.id);

    expect(db.playbackSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'athlete-1', mode: 'FULL', status: 'ACTIVE' },
      data: { status: 'REVOKED', closedAt: expect.any(Date) },
    });
    expect(createdSession()?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createdSession()?.tokenHash).not.toBe(result.playbackToken);
    expect(result).toMatchObject({
      playbackSessionId: 'session-1',
      mode: 'FULL',
      watermarkId: expect.stringMatching(/^[a-f0-9]{12}$/),
    });
  });

  it('stores an impossible jump as rejected without changing progress', async () => {
    const { db, createdSession } = playbackDatabase();
    const heartbeatCreate = vi.fn().mockImplementation(({ data }) => Promise.resolve(data));
    Object.assign(db, {
      playbackHeartbeat: { findFirst: vi.fn().mockResolvedValue(null), create: heartbeatCreate },
    });
    const service = new ContentService(
      db as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video-1') } as never,
      { requireAccess: vi.fn() } as never,
    );
    const playback = await service.playback('athlete-1', UserRole.ATHLETE, video.id);
    Object.assign(db.playbackSession, {
      findUnique: vi.fn().mockResolvedValue({
        id: 'session-1',
        ...createdSession(),
        status: PlaybackSessionStatus.ACTIVE,
        lastSequence: 0,
        creditedPositionSec: 0,
        createdAt: new Date(Date.now() - 5000),
        lastHeartbeatAt: null,
        video,
      }),
      update: vi.fn(),
    });

    const result = await service.heartbeat('athlete-1', video.id, {
      playbackToken: playback.playbackToken,
      idempotencyKey: 'heartbeat-0001',
      sequence: 1,
      previousPositionSec: 0,
      currentPositionSec: 80,
      activePlaybackMs: 5000,
      playbackRate: 1,
      visible: true,
      active: true,
      clientAt: new Date().toISOString(),
    });

    expect(result).toMatchObject({
      accepted: false,
      processed: true,
      watchedSeconds: 0,
      rejectionReason: 'IMPOSSIBLE_POSITION_JUMP',
    });
    expect(heartbeatCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ accepted: false, creditedPositionSec: 0 }),
    });
  });

  it('returns a duplicate heartbeat without inserting it again', async () => {
    const { db, createdSession } = playbackDatabase();
    const duplicate = {
      accepted: true,
      creditedPositionSec: 15,
      rejectionReason: null,
      sequence: 1,
    };
    Object.assign(db, {
      playbackHeartbeat: {
        findFirst: vi.fn().mockResolvedValue(duplicate),
        create: vi.fn(),
      },
    });
    const service = new ContentService(
      db as never,
      { playbackUrl: vi.fn().mockResolvedValue('http://storage/video-1') } as never,
      { requireAccess: vi.fn() } as never,
    );
    const playback = await service.playback('athlete-1', UserRole.ATHLETE, video.id);
    Object.assign(db.playbackSession, {
      findUnique: vi.fn().mockResolvedValue({
        id: 'session-1',
        ...createdSession(),
        status: PlaybackSessionStatus.ACTIVE,
        lastSequence: 1,
        creditedPositionSec: 15,
        createdAt: new Date(Date.now() - 15000),
        lastHeartbeatAt: new Date(),
        video,
      }),
      update: vi.fn(),
    });

    const result = await service.heartbeat('athlete-1', video.id, {
      playbackToken: playback.playbackToken,
      idempotencyKey: 'heartbeat-0001',
      sequence: 1,
      previousPositionSec: 0,
      currentPositionSec: 15,
      activePlaybackMs: 15000,
      playbackRate: 1,
      visible: true,
      active: true,
      clientAt: new Date().toISOString(),
    });

    expect(result).toMatchObject({ accepted: true, processed: false, watchedSeconds: 15 });
    expect(db.playbackHeartbeat.create).not.toHaveBeenCalled();
  });

  it('rejects the legacy athlete progress endpoint', async () => {
    const service = new ContentService({} as never, {} as never, {} as never);
    await expect(service.recordWatch('athlete-1', UserRole.ATHLETE, video.id, 80)).rejects.toThrow(
      'PLAYBACK_HEARTBEAT_REQUIRED',
    );
  });
});
