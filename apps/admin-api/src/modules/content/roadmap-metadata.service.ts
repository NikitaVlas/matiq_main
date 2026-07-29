import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';

const ROADMAP_TOPICS = [
  { key: 'standing', name: 'Arbeit im Stand' },
  { key: 'top-control', name: 'Kontrolle von oben' },
  { key: 'bottom-escape', name: 'Escapes von unten' },
  { key: 'mount-top', name: 'Mount-Kontrolle' },
  { key: 'mount-bottom', name: 'Mount-Escapes' },
  { key: 'closed-guard', name: 'Geschlossene Guard' },
  { key: 'open-guard', name: 'Offene Guard' },
  { key: 'side-control-top', name: 'Side-Control-Kontrolle' },
];

@Injectable()
export class RoadmapMetadataService {
  constructor(private readonly db: AdminDatabaseService) {}

  async ensureField() {
    const field = await this.db.metadataField.upsert({
      where: { key: 'roadmap-topic' },
      create: { key: 'roadmap-topic', name: 'Roadmap-Thema' },
      update: { name: 'Roadmap-Thema' },
    });
    await Promise.all(
      ROADMAP_TOPICS.map((topic) =>
        this.db.metadataOption.upsert({
          where: { fieldId_key: { fieldId: field.id, key: topic.key } },
          create: { ...topic, fieldId: field.id },
          update: { name: topic.name },
        }),
      ),
    );
    return field;
  }

  async fields() {
    await this.ensureField();
    return this.db.metadataField.findMany({
      include: { options: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async createTopic(input: { key?: string; name?: string }) {
    const name = input.name?.trim();
    const key = input.key?.trim().toLowerCase();
    if (!name || name.length > 120 || !key || !/^[a-z0-9-]{1,100}$/.test(key)) {
      throw new BadRequestException('INVALID_ROADMAP_TOPIC');
    }
    const field = await this.ensureField();
    const existing = await this.db.metadataOption.findUnique({
      where: { fieldId_key: { fieldId: field.id, key } },
    });
    if (existing) throw new ConflictException('ROADMAP_TOPIC_ALREADY_EXISTS');
    return this.db.metadataOption.create({ data: { fieldId: field.id, key, name } });
  }

  async coverage() {
    const field = await this.ensureField();
    const options = await this.db.metadataOption.findMany({
      where: { fieldId: field.id },
      orderBy: { name: 'asc' },
    });
    return Promise.all(
      options.map(async (option) => ({
        id: option.id,
        key: option.key,
        name: option.name,
        publishedVideoCount: await this.db.videoMetadataOption.count({
          where: { optionId: option.id, video: { published: true } },
        }),
      })),
    );
  }

  async diagnostics() {
    const topics = await this.coverage();
    const questions = await this.db.assessmentQuestion.findMany({
      where: { active: true },
      select: { skillKey: true, kind: true, options: true },
    });
    const assessmentMappings = new Map<string, number>();
    for (const question of questions) {
      if (question.kind === 'CONFIDENCE')
        assessmentMappings.set(
          question.skillKey,
          (assessmentMappings.get(question.skillKey) ?? 0) + 1,
        );
      if (!Array.isArray(question.options)) continue;
      for (const raw of question.options) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const option = raw as { skillKey?: unknown };
        if (typeof option.skillKey !== 'string') continue;
        assessmentMappings.set(
          option.skillKey,
          (assessmentMappings.get(option.skillKey) ?? 0) + 1,
        );
      }
    }
    const enrichedTopics = await Promise.all(
      topics.map(async (topic) => ({
        ...topic,
        draftVideoCount: await this.db.videoMetadataOption.count({
          where: { optionId: topic.id, video: { published: false } },
        }),
        assessmentMappingCount: assessmentMappings.get(topic.key) ?? 0,
      })),
    );
    const unlinkedVideos = await this.db.video.findMany({
      where: {
        published: true,
        metadataValues: { none: { option: { field: { key: 'roadmap-topic' } } } },
      },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
    return { topics: enrichedTopics, unlinkedVideos };
  }
}
