import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AssessmentContext, Discipline, UserRole } from '@prisma/client';
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

  async courses() {
    return this.db.course.findMany({
      where: { published: true },
      orderBy: { createdAt: 'asc' },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { published: true },
              orderBy: { position: 'asc' },
              include: {
                video: true,
                outgoingRelations: { include: { toLesson: true, trigger: true } },
              },
            },
          },
        },
      },
    });
  }
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

  async playback(userId: string, role: UserRole | undefined, videoId: string) {
    if (role !== UserRole.ADMIN && role !== UserRole.EDITOR)
      await this.subscriptions.requireAccess(userId);
    const video = await this.db.video.findUnique({
      where: { id: videoId },
      include: {
        position: true,
        technique: true,
        variant: true,
        movement: true,
        drill: true,
        watchEvents: { where: { userId }, take: 1 },
      },
    });
    if (!video || !video.published) throw new Error('VIDEO_NOT_AVAILABLE');
    const lesson = await this.db.lesson.findUnique({
      where: { videoId },
      include: {
        module: {
          include: {
            course: true,
            lessons: {
              where: { published: true, video: { published: true } },
              orderBy: { position: 'asc' },
              select: {
                id: true,
                videoId: true,
                title: true,
                position: true,
                video: {
                  select: {
                    durationSec: true,
                    watchEvents: {
                      where: { userId },
                      take: 1,
                      select: { watchedSeconds: true, completed: true },
                    },
                  },
                },
              },
            },
          },
        },
        outgoingRelations: {
          where: { toLesson: { published: true, video: { published: true } } },
          orderBy: { position: 'asc' },
          include: {
            trigger: { select: { name: true } },
            toLesson: { select: { id: true, videoId: true, title: true } },
          },
        },
      },
    });
    const courseContext =
      lesson?.published && lesson.module.course.published
        ? {
            course: {
              id: lesson.module.course.id,
              title: lesson.module.course.title,
              discipline: lesson.module.course.discipline,
            },
            module: { id: lesson.module.id, title: lesson.module.title },
            currentLesson: {
              id: lesson.id,
              title: lesson.title,
              goal: lesson.goal,
              startingPosition: lesson.startingPosition,
              endingPosition: lesson.endingPosition,
              level: lesson.level,
              giNoGi: lesson.giNoGi,
              position: lesson.position,
            },
            lessons: lesson.module.lessons.map((item) => ({
              id: item.id,
              videoId: item.videoId,
              title: item.title,
              position: item.position,
              durationSec: item.video.durationSec,
              watchedSeconds: item.video.watchEvents[0]?.watchedSeconds ?? 0,
              completed: item.video.watchEvents[0]?.completed ?? false,
              current: item.id === lesson.id,
            })),
            continuations: lesson.outgoingRelations.map((relation) => ({
              type: relation.type,
              lessonId: relation.toLesson.id,
              videoId: relation.toLesson.videoId,
              title: relation.toLesson.title,
              trigger: relation.trigger?.name ?? relation.condition,
            })),
          }
        : null;
    return {
      video,
      playbackUrl: await this.storage.playbackUrl(video.storageKey),
      expiresIn: 300,
      userId,
      watchedSeconds: video.watchEvents[0]?.watchedSeconds ?? 0,
      courseContext,
    };
  }

  async recommendations(userId: string, role: UserRole | undefined, videoId: string) {
    if (role !== UserRole.ADMIN && role !== UserRole.EDITOR)
      await this.subscriptions.requireAccess(userId);

    const currentLesson = await this.db.lesson.findUnique({
      where: { videoId },
      include: {
        outgoingRelations: {
          orderBy: { position: 'asc' },
          include: { trigger: true, toLesson: { include: { video: true } } },
        },
      },
    });
    const completed = await this.db.videoWatch.findMany({
      where: { userId, completed: true },
      select: { videoId: true },
    });
    const excludedVideoIds = new Set([videoId, ...completed.map((watch) => watch.videoId)]);
    const metadataValues = await this.db.videoMetadataOption.findMany({
      where: { videoId },
      select: {
        optionId: true,
        option: { select: { key: true, name: true, field: { select: { key: true } } } },
      },
    });
    const disciplineOption = metadataValues.find((value) => value.option.field.key === 'discipline')
      ?.option.key;
    const roadmapDiscipline =
      disciplineOption === 'bjj-gi'
        ? 'BJJ_GI'
        : disciplineOption === 'no-gi'
          ? 'NO_GI_GRAPPLING'
          : undefined;

    const profile = await this.db.athleteProfile.findUnique({
      where: { userId },
      include: {
        roadmapItems: {
          where: { isHidden: false, completedAt: null, discipline: roadmapDiscipline },
          orderBy: { position: 'asc' },
          include: { lesson: { include: { video: true } } },
        },
      },
    });

    let roadmap = null as Recommendation | null;
    for (const item of profile?.roadmapItems ?? []) {
      const direct = item.lesson;
      if (direct?.published && direct.video.published && !excludedVideoIds.has(direct.videoId)) {
        roadmap = recommendation('ROADMAP', direct, `Roadmap: ${item.title}`);
        break;
      }
      if (!item.skillKey) continue;
      const video = await this.db.video.findFirst({
        where: {
          id: { notIn: [...excludedVideoIds] },
          published: true,
          Lesson: { published: true },
          metadataValues: {
            some: {
              option: {
                key: disciplineMetadataKey(item.discipline),
                field: { key: 'discipline' },
              },
            },
          },
          OR: [
            { position: { key: item.skillKey } },
            { technique: { key: item.skillKey } },
            {
              metadataValues: {
                some: { option: { key: item.skillKey, field: { key: 'roadmap-topic' } } },
              },
            },
          ],
        },
        include: { Lesson: true },
      });
      if (video?.Lesson) {
        roadmap = recommendation('ROADMAP', video.Lesson, `Roadmap: ${item.title}`);
        break;
      }
    }

    const availableRelations =
      currentLesson?.outgoingRelations.filter(
        (relation) =>
          relation.toLesson.published &&
          relation.toLesson.video.published &&
          !excludedVideoIds.has(relation.toLesson.videoId),
      ) ?? [];
    const pathRelation =
      availableRelations.find((relation) => relation.type === 'PRIMARY') ?? availableRelations[0];
    const lessonPathCandidate = pathRelation
      ? recommendation(
          'LESSON_PATH',
          pathRelation.toLesson,
          pathRelation.type === 'PRIMARY'
            ? 'Nächster Schritt in dieser Technikfolge'
            : `Abzweigung: ${pathRelation.trigger?.name ?? pathRelation.condition ?? 'alternative Reaktion'}`,
        )
      : null;
    const lessonPath =
      lessonPathCandidate?.videoId === roadmap?.videoId ? null : lessonPathCandidate;

    let metadataFallback = null as Recommendation | null;
    if (metadataValues.length) {
      const optionIds = metadataValues.map((value) => value.optionId);
      const candidates = await this.db.video.findMany({
        where: {
          id: {
            notIn: [
              ...excludedVideoIds,
              ...(roadmap ? [roadmap.videoId] : []),
              ...(lessonPath ? [lessonPath.videoId] : []),
            ],
          },
          published: true,
          Lesson: { published: true },
          metadataValues: { some: { optionId: { in: optionIds } } },
        },
        include: {
          Lesson: true,
          metadataValues: { where: { optionId: { in: optionIds } }, include: { option: true } },
        },
        take: 20,
      });
      const candidate = candidates.sort(
        (left, right) => right.metadataValues.length - left.metadataValues.length,
      )[0];
      if (candidate?.Lesson) {
        const shared = candidate.metadataValues.map((value) => value.option.name).join(', ');
        metadataFallback = recommendation(
          'METADATA',
          candidate.Lesson,
          `Passende Themen: ${shared}`,
        );
      }
    }

    return {
      primarySource: roadmap
        ? 'ROADMAP'
        : lessonPath
          ? 'LESSON_PATH'
          : metadataFallback
            ? 'METADATA'
            : null,
      roadmap,
      lessonPath,
      metadataFallback,
    };
  }

  async recordWatch(
    userId: string,
    role: UserRole | undefined,
    videoId: string,
    watchedSeconds: number,
  ) {
    if (role !== UserRole.ADMIN && role !== UserRole.EDITOR)
      await this.subscriptions.requireAccess(userId);
    const video = await this.db.video.findUnique({ where: { id: videoId } });
    if (!video || !video.published) throw new Error('VIDEO_NOT_AVAILABLE');
    if (!Number.isFinite(watchedSeconds)) {
      throw new BadRequestException('INVALID_WATCH_PROGRESS');
    }
    const seconds = Math.min(
      Math.max(0, watchedSeconds),
      video.durationSec ?? Number.POSITIVE_INFINITY,
    );
    const watched = Boolean(video.durationSec && seconds >= video.durationSec * 0.8);
    const existing = await this.db.videoWatch.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    const progress = Math.max(existing?.watchedSeconds ?? 0, seconds);
    const completed = Boolean(existing?.completed || watched);
    const newlyCompleted = completed && !existing?.completed;
    const watchEvent = await this.db.videoWatch.upsert({
      where: { videoId_userId: { videoId, userId } },
      create: { videoId, userId, watchedSeconds: progress, completed },
      update: { watchedSeconds: progress, completed },
    });
    let roadmapItemsCompleted = 0;
    if (newlyCompleted) {
      const result = await this.db.roadmapItem.updateMany({
        where: {
          athleteProfile: { userId },
          lesson: { videoId },
          completedAt: null,
          OR: [{ isAddedByUser: true }, { skillKey: null }],
        },
        data: { completedAt: new Date() },
      });
      roadmapItemsCompleted = result.count;
      const topicValues = await this.db.videoMetadataOption.findMany({
        where: { videoId, option: { field: { key: 'roadmap-topic' } } },
        select: { option: { select: { key: true } } },
      });
      const topicKeys = topicValues.map((value) => value.option.key);
      if (topicKeys.length) {
        const items = await this.db.roadmapItem.findMany({
          where: {
            athleteProfile: { userId },
            skillKey: { in: topicKeys },
            completedAt: null,
            isHidden: false,
          },
          select: { id: true, skillKey: true, discipline: true },
        });
        for (const item of items) {
          if (!item.skillKey) continue;
          const requiredWhere = {
            published: true,
            metadataValues: {
              some: { option: { key: item.skillKey, field: { key: 'roadmap-topic' } } },
            },
            AND: [
              {
                metadataValues: {
                  some: { option: { key: 'required', field: { key: 'roadmap-content-role' } } },
                },
              },
              {
                metadataValues: {
                  some: {
                    option: {
                      key: disciplineMetadataKey(item.discipline),
                      field: { key: 'discipline' },
                    },
                  },
                },
              },
            ],
          };
          const requiredCount = await this.db.video.count({ where: requiredWhere });
          if (!requiredCount) continue;
          const incompleteCount = await this.db.video.count({
            where: {
              ...requiredWhere,
              watchEvents: { none: { userId, completed: true } },
            },
          });
          if (incompleteCount) continue;
          await this.db.roadmapItem.update({
            where: { id: item.id },
            data: { completedAt: new Date() },
          });
          roadmapItemsCompleted += 1;
        }
      }
    }
    return { ...watchEvent, newlyCompleted, roadmapItemsCompleted };
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

type RecommendationSource = 'ROADMAP' | 'LESSON_PATH' | 'METADATA';
type Recommendation = {
  source: RecommendationSource;
  lessonId: string;
  videoId: string;
  title: string;
  reason: string;
};

function recommendation(
  source: RecommendationSource,
  lesson: { id: string; videoId: string; title: string },
  reason: string,
): Recommendation {
  return { source, lessonId: lesson.id, videoId: lesson.videoId, title: lesson.title, reason };
}

function disciplineMetadataKey(discipline: Discipline) {
  return discipline === Discipline.BJJ_GI ? 'bjj-gi' : 'no-gi';
}
