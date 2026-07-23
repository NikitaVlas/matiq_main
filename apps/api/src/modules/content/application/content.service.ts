import { Inject, Injectable } from '@nestjs/common';
import { AssessmentContext, Discipline } from '@prisma/client';
import { Database } from '../../../shared/infrastructure/database';
import { VideoStorageService } from '../infrastructure/video-storage.service';
import { SubscriptionService } from '../../subscription/application/subscription.service';

@Injectable()
export class ContentService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(VideoStorageService) private readonly storage: VideoStorageService,
    @Inject(SubscriptionService) private readonly subscriptions: SubscriptionService,
  ) {}

  async catalog() {
    await this.seed();
    return this.db.gameArea.findMany({
      include: {
        positions: {
          include: {
            skillGroups: {
              include: {
                techniques: { include: { variants: true, videos: { where: { published: true } } } },
              },
            },
            videos: { where: { published: true } },
          },
        },
      },
    });
  }

  async playback(userId: string, videoId: string) {
    await this.subscriptions.requireAccess(userId);
    const video = await this.db.video.findUnique({
      where: { id: videoId },
      include: { position: true, technique: true, variant: true, movement: true, drill: true },
    });
    if (!video || !video.published) throw new Error('VIDEO_NOT_AVAILABLE');
    return {
      video,
      playbackUrl: await this.storage.playbackUrl(video.storageKey),
      expiresIn: 300,
      userId,
    };
  }

  async recordWatch(userId: string, videoId: string, watchedSeconds: number, _completed: boolean) {
    await this.subscriptions.requireAccess(userId);
    const video = await this.db.video.findUnique({ where: { id: videoId } });
    if (!video || !video.published) throw new Error('VIDEO_NOT_AVAILABLE');
    const seconds = Math.max(0, watchedSeconds);
    const watched = Boolean(video.durationSec && seconds >= video.durationSec * 0.8);
    return this.db.videoWatch.upsert({
      where: { videoId_userId: { videoId, userId } },
      create: { videoId, userId, watchedSeconds: seconds, completed: watched },
      update: { watchedSeconds: seconds, completed: watched },
    });
  }

  async history(userId: string) {
    return this.db.videoWatch.findMany({
      where: { userId, video: { published: true } },
      include: { video: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async seed() {
    const area = await this.db.gameArea.upsert({
      where: { key: 'bjj-gi' },
      update: {},
      create: { key: 'bjj-gi', name: 'BJJ Gi', discipline: Discipline.BJJ_GI },
    });
    const standing = await this.db.position.upsert({
      where: { gameAreaId_key: { gameAreaId: area.id, key: 'standing' } },
      update: {},
      create: {
        gameAreaId: area.id,
        key: 'standing',
        name: 'Arbeit im Stand',
        context: AssessmentContext.STANDING,
      },
    });
    const takedown = await this.db.skillGroup.upsert({
      where: { positionId_key: { positionId: standing.id, key: 'takedowns' } },
      update: {},
      create: { positionId: standing.id, key: 'takedowns', name: 'Takedowns' },
    });
    const technique = await this.db.technique.upsert({
      where: { key: 'single-leg' },
      update: {},
      create: { skillGroupId: takedown.id, key: 'single-leg', name: 'Single Leg' },
    });
    await this.db.techniqueVariant.upsert({
      where: {
        techniqueId_discipline: { techniqueId: technique.id, discipline: Discipline.BJJ_GI },
      },
      update: {},
      create: {
        techniqueId: technique.id,
        discipline: Discipline.BJJ_GI,
        name: 'Single Leg im Gi',
      },
    });
    await this.db.movement.upsert({
      where: { key: 'technical-standup' },
      update: {},
      create: {
        key: 'technical-standup',
        name: 'Technical Stand-up',
        description: 'Sicheres Aufstehen aus einer sitzenden Position.',
      },
    });
  }
}
