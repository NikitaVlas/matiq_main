import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentContext, Prisma } from '@prisma/client';
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
    await this.generateRoadmap(profile.id, scores);
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
      include: { roadmapItems: { orderBy: { position: 'asc' }, include: { lesson: { include: { video: true, outgoingRelations: { include: { toLesson: true } } } } } } },
    });
    return {
      completed: Boolean(assessment?.completedAt),
      scores: assessment?.scores ?? [],
      roadmap: await Promise.all((profile?.roadmapItems.filter((item) => !item.isHidden) ?? []).map(async (item) => ({ ...item, videos: await this.recommendedVideos(item.skillKey) }))),
      hiddenRoadmap: profile?.roadmapItems.filter((item) => item.isHidden) ?? [],
    };
  }

  private async recommendedVideos(skillKey?: string | null) {
    if (!skillKey) return [];
    return this.db.video.findMany({ where: { published: true, OR: [{ position: { key: skillKey } }, { technique: { key: skillKey } }] }, select: { id: true, title: true }, take: 3 });
  }

  async addRoadmapItem(userId: string, title: string, skillKey?: string) {
    const profile = await this.db.athleteProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('ATHLETE_PROFILE_REQUIRED');
    const last = await this.db.roadmapItem.findFirst({
      where: { athleteProfileId: profile.id },
      orderBy: { position: 'desc' },
    });
    return this.db.roadmapItem.create({
      data: {
        athleteProfileId: profile.id,
        title,
        skillKey,
        type: 'TECHNIQUE',
        position: (last?.position ?? -1) + 1,
        isAddedByUser: true,
      },
    });
  }

  async updateRoadmapItem(userId: string, itemId: string, change: { isHidden?: boolean; direction?: 'up' | 'down' }) {
    const profile = await this.db.athleteProfile.findUniqueOrThrow({ where: { userId } });
    const item = await this.db.roadmapItem.findFirst({ where: { id: itemId, athleteProfileId: profile.id } });
    if (!item) throw new NotFoundException('ROADMAP_ITEM_NOT_FOUND');
    if (typeof change.isHidden === 'boolean') return this.db.roadmapItem.update({ where: { id: item.id }, data: { isHidden: change.isHidden } });
    if (!change.direction) return item;
    const neighbor = await this.db.roadmapItem.findFirst({ where: { athleteProfileId: profile.id, isHidden: false, position: change.direction === 'up' ? { lt: item.position } : { gt: item.position } }, orderBy: { position: change.direction === 'up' ? 'desc' : 'asc' } });
    if (!neighbor) return item;
    await this.db.$transaction([
      this.db.roadmapItem.update({ where: { id: item.id }, data: { position: neighbor.position } }),
      this.db.roadmapItem.update({ where: { id: neighbor.id }, data: { position: item.position } }),
    ]);
    return this.db.roadmapItem.findUniqueOrThrow({ where: { id: item.id } });
  }

  private async generateRoadmap(profileId: string, scores: Map<string, number>) {
    await this.db.roadmapItem.deleteMany({
      where: { athleteProfileId: profileId, isAddedByUser: false },
    });
    const labels: Record<string, string> = {
      standing: 'Arbeit im Stand',
      'top-control': 'Kontrolle von oben',
      'bottom-escape': 'Escapes von unten',
    };
    const items = [...scores.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([skillKey], index) => ({
        athleteProfileId: profileId,
        type: 'SKILL_GROUP' as const,
        title: labels[skillKey] ?? skillKey,
        skillKey,
        position: index,
      }));
    if (items.length) await this.db.roadmapItem.createMany({ data: items });
  }
}
