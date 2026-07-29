import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentContext, Discipline, Prisma } from '@prisma/client';
import { Database } from '../../../shared/infrastructure/database';
import { SubscriptionService } from '../../subscription/application/subscription.service';

const QUESTION_SEED = [
  {
    key: 'standing-confidence',
    text: 'Wie sicher fühlst du dich im Stand?',
    context: AssessmentContext.STANDING,
    skillKey: 'standing',
    options: [
      { key: 'never', label: 'Ich weiß nicht, wie ich anfangen soll', value: 1 },
      { key: 'rarely', label: 'Es gelingt selten', value: 2 },
      { key: 'sometimes', label: 'Manchmal gelingt es', value: 3 },
      { key: 'usually', label: 'Meistens gelingt es', value: 4 },
      { key: 'competition', label: 'Ich wende es sicher im Wettkampf an', value: 5 },
    ],
  },
  {
    key: 'top-control',
    text: 'Wie sicher arbeitest du von oben?',
    context: AssessmentContext.TOP,
    skillKey: 'top-control',
    options: [
      { key: 'never', label: 'Ich verliere die Position schnell', value: 1 },
      { key: 'rarely', label: 'Es gelingt selten', value: 2 },
      { key: 'sometimes', label: 'Manchmal gelingt es', value: 3 },
      { key: 'usually', label: 'Meistens gelingt es', value: 4 },
      { key: 'competition', label: 'Ich kontrolliere sicher im Wettkampf', value: 5 },
    ],
  },
  {
    key: 'bottom-escape',
    text: 'Wie sicher kommst du unten aus Side Control heraus?',
    context: AssessmentContext.BOTTOM,
    skillKey: 'bottom-escape',
    options: [
      { key: 'never', label: 'Ich kenne keine Ausgänge', value: 1 },
      { key: 'rarely', label: 'Es gelingt selten', value: 2 },
      { key: 'sometimes', label: 'Manchmal gelingt es', value: 3 },
      { key: 'usually', label: 'Meistens gelingt es', value: 4 },
      { key: 'competition', label: 'Ich wende es sicher im Wettkampf an', value: 5 },
    ],
  },
  {
    key: 'mount-top-confidence',
    text: 'Wie sicher kontrollierst du die Mount-Position von oben?',
    context: AssessmentContext.TOP,
    skillKey: 'mount-top',
    options: confidenceOptions('Ich verliere die Mount-Position schnell'),
  },
  {
    key: 'mount-bottom-confidence',
    text: 'Wie sicher befreist du dich aus der Mount-Position?',
    context: AssessmentContext.BOTTOM,
    skillKey: 'mount-bottom',
    options: confidenceOptions('Ich kenne keine sicheren Befreiungen'),
  },
  {
    key: 'closed-guard-confidence',
    text: 'Wie sicher arbeitest du aus der geschlossenen Guard?',
    context: AssessmentContext.BOTTOM,
    skillKey: 'closed-guard',
    options: confidenceOptions('Ich kann aus der geschlossenen Guard kaum angreifen'),
  },
  {
    key: 'open-guard-confidence',
    text: 'Wie sicher arbeitest du aus der offenen Guard?',
    context: AssessmentContext.BOTTOM,
    skillKey: 'open-guard',
    options: confidenceOptions('Ich verliere Distanz und Kontrolle schnell'),
  },
  {
    key: 'side-control-top-confidence',
    text: 'Wie sicher kontrollierst du Side Control von oben?',
    context: AssessmentContext.TOP,
    skillKey: 'side-control-top',
    options: confidenceOptions('Ich verliere Side Control schnell'),
  },
];

@Injectable()
export class AssessmentService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(SubscriptionService) private readonly subscriptions: SubscriptionService,
  ) {}

  async questions() {
    for (const question of QUESTION_SEED) {
      await this.db.assessmentQuestion.upsert({
        where: { key: question.key },
        create: question as Prisma.AssessmentQuestionCreateInput,
        update: { text: question.text, options: question.options, active: true },
      });
    }
    return this.db.assessmentQuestion.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async submit(userId: string, answers: { questionKey: string; optionKey: string }[]) {
    const questions = await this.questions();
    const profile = await this.db.athleteProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('ATHLETE_PROFILE_REQUIRED');
    const selected = answers.map((answer) => {
      const question = questions.find((item) => item.key === answer.questionKey);
      const option = (question?.options as Array<{ key: string; value: number }> | undefined)?.find(
        (item) => item.key === answer.optionKey,
      );
      if (!question || !option) throw new NotFoundException('ASSESSMENT_OPTION_NOT_FOUND');
      return { question, option };
    });
    const scores = new Map<string, number>();
    for (const item of selected) scores.set(item.question.skillKey, item.option.value);
    const assessment = await this.db.assessment.upsert({
      where: { userId },
      create: { userId, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
    await this.db.$transaction([
      this.db.assessmentResponse.deleteMany({ where: { assessmentId: assessment.id } }),
      this.db.skillScore.deleteMany({ where: { assessmentId: assessment.id } }),
      ...selected.map((item) =>
        this.db.assessmentResponse.create({
          data: {
            assessmentId: assessment.id,
            questionId: item.question.id,
            optionKey: item.option.key,
            value: item.option.value,
          },
        }),
      ),
      ...Array.from(scores.entries()).map(([skillKey, score]) =>
        this.db.skillScore.create({ data: { assessmentId: assessment.id, skillKey, score } }),
      ),
    ]);
    await this.generateRoadmap(profile.id, profile.disciplines, scores);
    await this.subscriptions.startTrial(userId);
    return this.getResult(userId);
  }

  async getResult(userId: string) {
    const assessment = await this.db.assessment.findUnique({
      where: { userId },
      include: { scores: true },
    });
    const profile = await this.db.athleteProfile.findUnique({
      where: { userId },
      include: {
        roadmapItems: {
          orderBy: { position: 'asc' },
          include: {
            lesson: {
              include: { video: true, outgoingRelations: { include: { toLesson: true } } },
            },
          },
        },
      },
    });
    const roadmapItems = profile?.roadmapItems ?? [];
    const roadmaps = (profile?.disciplines ?? []).map((discipline) => ({
      discipline,
      items: roadmapItems.filter(
        (item) => item.discipline === discipline && !item.isHidden && item.completedAt === null,
      ),
      completedItems: roadmapItems.filter(
        (item) => item.discipline === discipline && !item.isHidden && item.completedAt !== null,
      ),
      hiddenItems: roadmapItems.filter((item) => item.discipline === discipline && item.isHidden),
    }));
    const primaryRoadmap = roadmaps[0];
    return {
      completed: Boolean(assessment?.completedAt),
      scores: assessment?.scores ?? [],
      roadmaps: await Promise.all(
        roadmaps.map(async (roadmap) => ({
          ...roadmap,
          items: await Promise.all(
            roadmap.items.map(async (item) => ({
              ...item,
              videos: await this.roadmapVideos(item),
            })),
          ),
        })),
      ),
      roadmap: await Promise.all(
        (primaryRoadmap?.items ?? []).map(async (item) => ({
          ...item,
          videos: await this.roadmapVideos(item),
        })),
      ),
      hiddenRoadmap: primaryRoadmap?.hiddenItems ?? [],
    };
  }

  private async roadmapVideos(item: {
    skillKey: string | null;
    discipline: Discipline;
    lesson: { video: { id: string; title: string; published: boolean } } | null;
  }) {
    const recommended = await this.recommendedVideos(item.skillKey, item.discipline);
    const direct = item.lesson?.video.published
      ? [{ id: item.lesson.video.id, title: item.lesson.video.title }]
      : [];
    return [...direct, ...recommended].filter(
      (video, index, videos) => videos.findIndex((item) => item.id === video.id) === index,
    );
  }

  private async recommendedVideos(skillKey: string | null | undefined, discipline: Discipline) {
    if (!skillKey) return [];
    return this.db.video.findMany({
      where: {
        published: true,
        metadataValues: {
          some: {
            option: {
              key: disciplineMetadataKey(discipline),
              field: { key: 'discipline' },
            },
          },
        },
        OR: [
          { position: { key: skillKey } },
          { technique: { key: skillKey } },
          { metadataValues: { some: { option: { key: skillKey } } } },
        ],
      },
      select: { id: true, title: true },
      take: 3,
    });
  }

  async addRoadmapItem(
    userId: string,
    title: string,
    skillKey?: string,
    lessonId?: string,
    discipline?: Discipline,
  ) {
    const profile = await this.db.athleteProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('ATHLETE_PROFILE_REQUIRED');
    const selectedDiscipline = discipline ?? profile.disciplines[0];
    if (!selectedDiscipline || !profile.disciplines.includes(selectedDiscipline))
      throw new BadRequestException('DISCIPLINE_NOT_SELECTED');
    if (lessonId) {
      const lesson = await this.db.lesson.findFirst({
        where: {
          id: lessonId,
          published: true,
          video: {
            metadataValues: {
              some: {
                option: {
                  key: disciplineMetadataKey(selectedDiscipline),
                  field: { key: 'discipline' },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!lesson) throw new BadRequestException('LESSON_NOT_AVAILABLE');
    }
    const last = await this.db.roadmapItem.findFirst({
      where: { athleteProfileId: profile.id, discipline: selectedDiscipline },
      orderBy: { position: 'desc' },
    });
    return this.db.roadmapItem.create({
      data: {
        athleteProfileId: profile.id,
        discipline: selectedDiscipline,
        title,
        skillKey,
        lessonId,
        type: 'TECHNIQUE',
        position: (last?.position ?? -1) + 1,
        isAddedByUser: true,
      },
    });
  }

  async roadmapItemDetails(userId: string, itemId: string) {
    const item = await this.db.roadmapItem.findFirst({
      where: { id: itemId, athleteProfile: { userId } },
      select: {
        id: true,
        title: true,
        discipline: true,
        skillKey: true,
        completedAt: true,
      },
    });
    if (!item) throw new NotFoundException('ROADMAP_ITEM_NOT_FOUND');

    const videos = item.skillKey
      ? await this.db.video.findMany({
          where: {
            published: true,
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
              { metadataValues: { some: { option: { key: item.skillKey } } } },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            durationSec: true,
            watchEvents: {
              where: { userId },
              select: { watchedSeconds: true, completed: true },
              take: 1,
            },
            Lesson: {
              select: {
                id: true,
                title: true,
                published: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    course: {
                      select: { id: true, title: true, description: true, published: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const lessons = videos.map((video) => {
      const watch = video.watchEvents[0];
      const publishedLesson =
        video.Lesson?.published && video.Lesson.module.course.published ? video.Lesson : null;
      return {
        id: publishedLesson?.id ?? null,
        videoId: video.id,
        title: publishedLesson?.title ?? video.title,
        description: video.description,
        durationSec: video.durationSec,
        watchedSeconds: watch?.watchedSeconds ?? 0,
        completed: watch?.completed ?? false,
        course: publishedLesson
          ? {
              id: publishedLesson.module.course.id,
              title: publishedLesson.module.course.title,
              description: publishedLesson.module.course.description,
            }
          : null,
        module: publishedLesson
          ? { id: publishedLesson.module.id, title: publishedLesson.module.title }
          : null,
      };
    });
    const courses = lessons
      .flatMap((lesson) => (lesson.course ? [lesson.course] : []))
      .filter(
        (course, index, all) => all.findIndex((candidate) => candidate.id === course.id) === index,
      );
    const completedLessons = lessons.filter((lesson) => lesson.completed).length;

    return {
      item,
      progress: {
        completedLessons,
        totalLessons: lessons.length,
        percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
      },
      courses,
      lessons,
    };
  }

  async updateRoadmapItem(
    userId: string,
    itemId: string,
    change: { isHidden?: boolean; direction?: 'up' | 'down' },
  ) {
    const profile = await this.db.athleteProfile.findUniqueOrThrow({ where: { userId } });
    const item = await this.db.roadmapItem.findFirst({
      where: { id: itemId, athleteProfileId: profile.id },
    });
    if (!item) throw new NotFoundException('ROADMAP_ITEM_NOT_FOUND');
    if (typeof change.isHidden === 'boolean')
      return this.db.roadmapItem.update({
        where: { id: item.id },
        data: { isHidden: change.isHidden },
      });
    if (!change.direction) return item;
    const neighbor = await this.db.roadmapItem.findFirst({
      where: {
        athleteProfileId: profile.id,
        discipline: item.discipline,
        isHidden: false,
        position: change.direction === 'up' ? { lt: item.position } : { gt: item.position },
      },
      orderBy: { position: change.direction === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbor) return item;
    await this.db.$transaction([
      this.db.roadmapItem.update({ where: { id: item.id }, data: { position: neighbor.position } }),
      this.db.roadmapItem.update({ where: { id: neighbor.id }, data: { position: item.position } }),
    ]);
    return this.db.roadmapItem.findUniqueOrThrow({ where: { id: item.id } });
  }

  private async generateRoadmap(
    profileId: string,
    disciplines: Discipline[],
    scores: Map<string, number>,
  ) {
    await this.db.roadmapItem.deleteMany({
      where: { athleteProfileId: profileId, isAddedByUser: false },
    });
    const labels: Record<string, string> = {
      standing: 'Arbeit im Stand',
      'top-control': 'Kontrolle von oben',
      'bottom-escape': 'Escapes von unten',
      'mount-top': 'Mount-Kontrolle',
      'mount-bottom': 'Mount-Escapes',
      'closed-guard': 'Geschlossene Guard',
      'open-guard': 'Offene Guard',
      'side-control-top': 'Side-Control-Kontrolle',
    };
    const ranked = [...scores.entries()].sort((a, b) => a[1] - b[1]);
    const items = await Promise.all(
      disciplines.flatMap((discipline) =>
        ranked.map(async ([skillKey], index) => {
          const lesson = await this.db.lesson.findFirst({
            where: {
              published: true,
              video: {
                metadataValues: {
                  some: {
                    option: {
                      key: disciplineMetadataKey(discipline),
                      field: { key: 'discipline' },
                    },
                  },
                },
                OR: [
                  { position: { key: skillKey } },
                  { technique: { key: skillKey } },
                  { metadataValues: { some: { option: { key: skillKey } } } },
                ],
              },
            },
            select: { id: true },
          });
          return {
            athleteProfileId: profileId,
            discipline,
            type: 'SKILL_GROUP' as const,
            title: labels[skillKey] ?? skillKey,
            skillKey,
            lessonId: lesson?.id,
            position: index,
          };
        }),
      ),
    );
    if (items.length) await this.db.roadmapItem.createMany({ data: items });
  }
}

function confidenceOptions(lowLabel: string) {
  return [
    { key: 'never', label: lowLabel, value: 1 },
    { key: 'rarely', label: 'Es gelingt selten', value: 2 },
    { key: 'sometimes', label: 'Manchmal gelingt es', value: 3 },
    { key: 'usually', label: 'Meistens gelingt es', value: 4 },
    { key: 'competition', label: 'Ich wende es sicher im Wettkampf an', value: 5 },
  ];
}

function disciplineMetadataKey(discipline: Discipline) {
  return discipline === Discipline.BJJ_GI ? 'bjj-gi' : 'no-gi';
}
