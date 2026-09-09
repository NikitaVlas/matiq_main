import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentContext,
  AssessmentAttemptStatus,
  AssessmentConfidence,
  AssessmentMappingStatus,
  AssessmentQuestionKind,
  Discipline,
  Prisma,
  RoadmapItemSource,
  RoadmapRecommendationType,
} from '@prisma/client';
import { Database } from '../../../shared/infrastructure/database';

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
  {
    key: 'preferred-game',
    text: 'Welche Positionen und Techniken gehören bereits zu deinem Spiel?',
    context: AssessmentContext.TOP,
    skillKey: 'preferred-game',
    kind: AssessmentQuestionKind.PREFERENCE,
    multiple: true,
    allowCustom: true,
    options: [
      mappedOption('standing', 'Stand und Takedowns', 'standing', RoadmapRecommendationType.CORE),
      mappedOption(
        'top-control',
        'Kontrolle von oben',
        'top-control',
        RoadmapRecommendationType.CORE,
      ),
      mappedOption(
        'closed-guard',
        'Geschlossene Guard',
        'closed-guard',
        RoadmapRecommendationType.CORE,
      ),
      mappedOption('open-guard', 'Offene Guard', 'open-guard', RoadmapRecommendationType.CORE),
      mappedOption(
        'bottom-escape',
        'Escapes von unten',
        'bottom-escape',
        RoadmapRecommendationType.CORE,
      ),
    ],
  },
  {
    key: 'development-goal',
    text: 'Was möchtest du als Nächstes entwickeln?',
    context: AssessmentContext.TOP,
    skillKey: 'development-goal',
    kind: AssessmentQuestionKind.GOAL,
    multiple: true,
    allowCustom: true,
    options: [
      mappedOption(
        'standing',
        'Mein Standspiel aufbauen',
        'standing',
        RoadmapRecommendationType.EXPLORE,
      ),
      mappedOption(
        'top-control',
        'Mein Top Game erweitern',
        'top-control',
        RoadmapRecommendationType.EXPLORE,
      ),
      mappedOption(
        'closed-guard',
        'Aus der Closed Guard angreifen',
        'closed-guard',
        RoadmapRecommendationType.EXPLORE,
      ),
      mappedOption(
        'open-guard',
        'Eine Open Guard entwickeln',
        'open-guard',
        RoadmapRecommendationType.EXPLORE,
      ),
      mappedOption(
        'bottom-escape',
        'Sicherer aus schlechten Positionen entkommen',
        'bottom-escape',
        RoadmapRecommendationType.EXPLORE,
      ),
    ],
  },
];

type SubmissionAnswer = { questionKey: string; optionKey?: string; customText?: string };
type Recommendation = { skillKey: string; type: RoadmapRecommendationType; score: number };
const QUESTION_BANK_VERSION = 1;

@Injectable()
export class AssessmentService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async questions() {
    for (const question of QUESTION_SEED) {
      await this.db.assessmentQuestion.upsert({
        where: { key: question.key },
        create: question as Prisma.AssessmentQuestionCreateInput,
        update: {
          text: question.text,
          options: question.options,
          kind: question.kind ?? AssessmentQuestionKind.CONFIDENCE,
          multiple: question.multiple ?? false,
          allowCustom: question.allowCustom ?? false,
        },
      });
    }
    return this.db.assessmentQuestion.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async currentAnswers(userId: string) {
    const assessment = await this.db.assessment.findUnique({
      where: { userId },
      select: {
        completedAt: true,
        responses: {
          select: {
            optionKey: true,
            customText: true,
            mappingStatus: true,
            question: { select: { key: true } },
          },
        },
      },
    });
    return {
      completed: Boolean(assessment?.completedAt),
      answers: (assessment?.responses ?? []).map((response) => ({
        questionKey: response.question.key,
        optionKey: response.optionKey === '__custom__' ? undefined : response.optionKey,
        customText: response.customText ?? undefined,
        mappingStatus: response.mappingStatus,
      })),
    };
  }

  async currentAttempt(userId: string, discipline: Discipline) {
    return this.db.assessmentAttempt.findFirst({
      where: { userId, discipline, status: 'DRAFT' },
      orderBy: { updatedAt: 'desc' },
      include: { answers: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async saveDraft(userId: string, discipline: Discipline, answers: SubmissionAnswer[]) {
    const profile = await this.db.athleteProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('ATHLETE_PROFILE_REQUIRED');
    if (!profile.disciplines.includes(discipline))
      throw new BadRequestException('ASSESSMENT_DISCIPLINE_NOT_SELECTED');
    const questions = await this.questions();
    const selected = answers.map((answer) => {
      const question = questions.find((item) => item.key === answer.questionKey);
      if (!question) throw new NotFoundException('ASSESSMENT_QUESTION_NOT_FOUND');
      const customText = answer.customText?.trim();
      if (customText) {
        if (!question.allowCustom) throw new BadRequestException('CUSTOM_ANSWER_NOT_ALLOWED');
        return { questionKey: question.key, optionKey: null, customText };
      }
      const option = (question.options as Array<{ key: string }>).find(
        (item) => item.key === answer.optionKey,
      );
      if (!option) throw new NotFoundException('ASSESSMENT_OPTION_NOT_FOUND');
      return { questionKey: question.key, optionKey: option.key, customText: null };
    });
    const duplicate = new Set<string>();
    for (const answer of selected) {
      const key = `${answer.questionKey}:${answer.optionKey ?? '__custom__'}`;
      if (duplicate.has(key)) throw new BadRequestException('ASSESSMENT_DUPLICATE_ANSWER');
      duplicate.add(key);
    }
    const currentAttempt = await this.currentAttempt(userId, discipline);
    const questionBankSnapshot = this.questionBankSnapshot(questions);
    const attemptId =
      currentAttempt?.id ??
      (
        await this.db.assessmentAttempt.create({
          data: {
            userId,
            discipline,
            questionBankVersion: QUESTION_BANK_VERSION,
            questionBankSnapshot,
          },
        })
      ).id;
    await this.db.$transaction([
      this.db.assessmentAttemptAnswer.deleteMany({ where: { attemptId } }),
      ...selected.map((answer) =>
        this.db.assessmentAttemptAnswer.create({ data: { attemptId, ...answer } }),
      ),
    ]);
    return this.currentAttempt(userId, discipline);
  }

  async submit(userId: string, answers: SubmissionAnswer[]) {
    const questions = await this.questions();
    const profile = await this.db.athleteProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('ATHLETE_PROFILE_REQUIRED');
    const answerCounts = new Map<string, number>();
    const submittedValues = new Set<string>();
    const selected = answers.map((answer) => {
      const question = questions.find((item) => item.key === answer.questionKey);
      if (!question) throw new NotFoundException('ASSESSMENT_QUESTION_NOT_FOUND');
      answerCounts.set(question.key, (answerCounts.get(question.key) ?? 0) + 1);
      if (!question.multiple && answerCounts.get(question.key)! > 1)
        throw new BadRequestException('ASSESSMENT_SINGLE_ANSWER_REQUIRED');
      const customText = answer.customText?.trim();
      if (customText) {
        if (!question.allowCustom) throw new BadRequestException('CUSTOM_ANSWER_NOT_ALLOWED');
        const submissionKey = `${question.key}:__custom__`;
        if (submittedValues.has(submissionKey))
          throw new BadRequestException('ASSESSMENT_DUPLICATE_ANSWER');
        submittedValues.add(submissionKey);
        return { question, option: null, customText };
      }
      const option = (
        question.options as Array<{
          key: string;
          value: number;
          skillKey?: string;
          recommendationType?: RoadmapRecommendationType;
        }>
      ).find((item) => item.key === answer.optionKey);
      if (!option) throw new NotFoundException('ASSESSMENT_OPTION_NOT_FOUND');
      const submissionKey = `${question.key}:${option.key}`;
      if (submittedValues.has(submissionKey))
        throw new BadRequestException('ASSESSMENT_DUPLICATE_ANSWER');
      submittedValues.add(submissionKey);
      return { question, option, customText: undefined };
    });
    if (new Set(selected.map((item) => item.question.key)).size !== questions.length)
      throw new BadRequestException('ASSESSMENT_INCOMPLETE');
    const scores = new Map<string, number>();
    const recommendations: Recommendation[] = [];
    for (const item of selected) {
      if (!item.option) continue;
      if (item.question.kind === AssessmentQuestionKind.CONFIDENCE) {
        scores.set(item.question.skillKey, item.option.value);
        recommendations.push({
          skillKey: item.question.skillKey,
          type: RoadmapRecommendationType.GAP,
          score: item.option.value,
        });
      } else if (item.option.skillKey && item.option.recommendationType) {
        recommendations.push({
          skillKey: item.option.skillKey,
          type: item.option.recommendationType,
          score: item.option.value,
        });
      }
    }
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
            optionKey: item.option?.key ?? '__custom__',
            value: item.option?.value ?? 0,
            customText: item.customText,
            mappedSkillKey: item.option?.skillKey,
            mappingStatus: item.option
              ? AssessmentMappingStatus.MAPPED
              : AssessmentMappingStatus.UNMAPPED,
          },
        }),
      ),
      ...Array.from(scores.entries()).map(([skillKey, score]) =>
        this.db.skillScore.create({ data: { assessmentId: assessment.id, skillKey, score } }),
      ),
    ]);
    await this.recordCompletedAttempts(
      userId,
      profile.disciplines,
      selected,
      scores,
      this.questionBankSnapshot(questions),
      questions
        .filter((question) => question.kind === AssessmentQuestionKind.CONFIDENCE)
        .map((question) => question.skillKey),
    );
    await this.generateRoadmap(profile.id, profile.disciplines, scores, recommendations);
    return this.getResult(userId);
  }

  private async recordCompletedAttempts(
    userId: string,
    disciplines: Discipline[],
    selected: Array<{
      question: { key: string; kind: AssessmentQuestionKind; skillKey: string };
      option: { key: string; value: number } | null;
      customText?: string;
    }>,
    scores: Map<string, number>,
    questionBankSnapshot: Prisma.InputJsonValue,
    assessedSkillKeys: string[],
  ) {
    const completedAt = new Date();
    await Promise.all(
      disciplines.map(async (discipline) => {
        const draft = await this.currentAttempt(userId, discipline);
        const answers = selected.map((item) => ({
          questionKey: item.question.key,
          optionKey: item.option?.key,
          customText: item.customText,
        }));
        const evaluations = [...new Set(assessedSkillKeys)].map((skillKey) => {
          const score = scores.get(skillKey);
          return {
            skillKey,
            score,
            confidence:
              score === undefined
                ? AssessmentConfidence.INSUFFICIENT_DATA
                : AssessmentConfidence.SUFFICIENT,
            reasons: selected
              .filter((item) => item.question.skillKey === skillKey && item.option)
              .map((item) => ({ questionKey: item.question.key, optionKey: item.option?.key })),
          };
        });
        if (draft) {
          return this.db.assessmentAttempt.update({
            where: { id: draft.id },
            data: {
              status: AssessmentAttemptStatus.COMPLETED,
              completedAt,
              questionBankVersion: QUESTION_BANK_VERSION,
              questionBankSnapshot,
              answers: { deleteMany: {}, create: answers },
              evaluations: { deleteMany: {}, create: evaluations },
            },
          });
        }
        return this.db.assessmentAttempt.create({
          data: {
            userId,
            discipline,
            questionBankVersion: QUESTION_BANK_VERSION,
            questionBankSnapshot,
            status: AssessmentAttemptStatus.COMPLETED,
            completedAt,
            answers: { create: answers },
            evaluations: { create: evaluations },
          },
        });
      }),
    );
  }

  private questionBankSnapshot(
    questions: Array<{
      key: string;
      text: string;
      context: AssessmentContext;
      skillKey: string;
      kind: AssessmentQuestionKind;
      multiple: boolean;
      allowCustom: boolean;
      options: Prisma.JsonValue;
    }>,
  ): Prisma.InputJsonValue {
    return questions.map((question) => ({
      key: question.key,
      text: question.text,
      context: question.context,
      skillKey: question.skillKey,
      kind: question.kind,
      multiple: question.multiple,
      allowCustom: question.allowCustom,
      options: question.options as Prisma.InputJsonValue,
    }));
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
    const decorateItem = async (item: (typeof roadmapItems)[number]) => ({
      ...item,
      videos: await this.roadmapVideos(item),
      progress: await this.roadmapProgress(userId, item),
    });
    return {
      completed: Boolean(assessment?.completedAt),
      foundationActive: roadmapItems.some(
        (item) =>
          item.source === RoadmapItemSource.FOUNDATION &&
          !item.isHidden &&
          item.completedAt === null,
      ),
      scores: assessment?.scores ?? [],
      roadmaps: await Promise.all(
        roadmaps.map(async (roadmap) => ({
          ...roadmap,
          items: await Promise.all(roadmap.items.map(decorateItem)),
          completedItems: await Promise.all(roadmap.completedItems.map(decorateItem)),
        })),
      ),
      roadmap: await Promise.all((primaryRoadmap?.items ?? []).map(decorateItem)),
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

  private async roadmapProgress(
    userId: string,
    item: {
      skillKey: string | null;
      discipline: Discipline;
      lesson: { video: { id: string; published: boolean } } | null;
    },
  ) {
    const directVideoId = item.lesson?.video.published ? item.lesson.video.id : undefined;
    if (!item.skillKey && !directVideoId)
      return { completedVideos: 0, totalVideos: 0, percent: 0, status: 'NOT_STARTED' };
    const topicMatch = item.skillKey
      ? {
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
        }
      : undefined;
    const videos = await this.db.video.findMany({
      where: {
        published: true,
        OR: [
          ...(directVideoId ? [{ id: directVideoId }] : []),
          ...(topicMatch ? [topicMatch] : []),
        ],
      },
      select: {
        id: true,
        watchEvents: { where: { userId }, select: { completed: true }, take: 1 },
        metadataValues: {
          where: { option: { field: { key: 'roadmap-content-role' } } },
          select: { option: { select: { key: true } } },
        },
      },
    });
    const requiredVideos = videos.filter((video) =>
      video.metadataValues?.some((value) => value.option.key === 'required'),
    );
    const progressVideos = requiredVideos.length ? requiredVideos : videos;
    const completedVideos = progressVideos.filter(
      (video) => video.watchEvents[0]?.completed,
    ).length;
    const totalVideos = progressVideos.length;
    const percent = totalVideos ? Math.round((completedVideos / totalVideos) * 100) : 0;
    return {
      completedVideos,
      totalVideos,
      percent,
      status:
        completedVideos === 0
          ? 'NOT_STARTED'
          : completedVideos === totalVideos
            ? 'COMPLETED'
            : 'IN_PROGRESS',
    };
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
        source: RoadmapItemSource.MANUAL,
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
            metadataValues: {
              where: { option: { field: { key: 'roadmap-content-role' } } },
              select: { option: { select: { key: true } } },
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
        role: contentRole(video.metadataValues?.[0]?.option.key),
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
    const requiredLessons = lessons.filter((lesson) => lesson.role === 'REQUIRED');
    const progressLessons = requiredLessons.length ? requiredLessons : lessons;
    const completedLessons = progressLessons.filter((lesson) => lesson.completed).length;

    return {
      item,
      progress: {
        completedLessons,
        totalLessons: progressLessons.length,
        requiredLessons: requiredLessons.length,
        percent: progressLessons.length
          ? Math.round((completedLessons / progressLessons.length) * 100)
          : 0,
      },
      courses,
      lessons,
    };
  }

  async updateRoadmapItem(
    userId: string,
    itemId: string,
    change: { isHidden?: boolean; direction?: 'up' | 'down'; completed?: boolean },
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
    if (typeof change.completed === 'boolean')
      return this.db.roadmapItem.update({
        where: { id: item.id },
        data: { completedAt: change.completed ? new Date() : null },
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
    recommendationSignals?: Recommendation[],
  ) {
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
    const signals =
      recommendationSignals ??
      [...scores.entries()].map(([skillKey, score]) => ({
        skillKey,
        score,
        type: RoadmapRecommendationType.GAP,
      }));
    const priority = {
      [RoadmapRecommendationType.CORE]: 0,
      [RoadmapRecommendationType.GAP]: 1,
      [RoadmapRecommendationType.EXPLORE]: 2,
    };
    const ranked = [
      ...new Map(signals.map((item) => [`${item.type}:${item.skillKey}`, item])).values(),
    ].sort((a, b) => priority[a.type] - priority[b.type] || a.score - b.score);
    const desired = await Promise.all(
      disciplines.flatMap((discipline) =>
        ranked.map(async ({ skillKey, type }, index) => {
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
            recommendationType: type,
            reason: { source: 'ASSESSMENT', skillKey, recommendationType: type },
          };
        }),
      ),
    );
    const existing = await this.db.roadmapItem.findMany({
      where: { athleteProfileId: profileId, source: RoadmapItemSource.ASSESSMENT },
    });
    const desiredKeys = new Set(
      desired.map((item) => `${item.discipline}:${item.recommendationType}:${item.skillKey}`),
    );
    const obsolete = existing.filter(
      (item) =>
        !desiredKeys.has(`${item.discipline}:${item.recommendationType}:${item.skillKey ?? ''}`),
    );
    const operations: Prisma.PrismaPromise<unknown>[] = obsolete.map((item) =>
      this.db.roadmapItem.delete({ where: { id: item.id } }),
    );
    for (const item of desired) {
      const retained = existing.find(
        (candidate) =>
          candidate.discipline === item.discipline &&
          candidate.skillKey === item.skillKey &&
          candidate.recommendationType === item.recommendationType,
      );
      if (retained) {
        operations.push(
          this.db.roadmapItem.update({
            where: { id: retained.id },
            data: { title: item.title, lessonId: item.lessonId, reason: item.reason },
          }),
        );
      } else {
        operations.push(this.db.roadmapItem.create({ data: item }));
      }
    }
    if (operations.length) await this.db.$transaction(operations);
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

function mappedOption(
  key: string,
  label: string,
  skillKey: string,
  recommendationType: RoadmapRecommendationType,
) {
  return { key, label, value: 3, skillKey, recommendationType };
}

function disciplineMetadataKey(discipline: Discipline) {
  return discipline === Discipline.BJJ_GI ? 'bjj-gi' : 'no-gi';
}

function contentRole(key?: string) {
  return key === 'required' ? 'REQUIRED' : key === 'optional' ? 'OPTIONAL' : 'RECOMMENDED';
}
