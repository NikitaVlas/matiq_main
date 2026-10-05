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
const ROADMAP_CONTENT_ROLES = [
  { key: 'required', name: 'Required' },
  { key: 'recommended', name: 'Recommended' },
  { key: 'optional', name: 'Optional' },
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
    await Promise.all([this.ensureField(), this.ensureRoleField()]);
    return this.db.metadataField.findMany({
      include: { options: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureRoleField() {
    const field = await this.db.metadataField.upsert({
      where: { key: 'roadmap-content-role' },
      create: { key: 'roadmap-content-role', name: 'Roadmap content role' },
      update: { name: 'Roadmap content role' },
    });
    await Promise.all(
      ROADMAP_CONTENT_ROLES.map((role) =>
        this.db.metadataOption.upsert({
          where: { fieldId_key: { fieldId: field.id, key: role.key } },
          create: { ...role, fieldId: field.id },
          update: { name: role.name },
        }),
      ),
    );
    return field;
  }

  async createTopic(input: { key?: string; name?: string; parentId?: string | null }) {
    if (
      input.parentId != null &&
      (typeof input.parentId !== 'string' || input.parentId.length > 100)
    )
      throw new BadRequestException('INVALID_ROADMAP_PARENT');
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const key = typeof input.key === 'string' ? input.key.trim().toLowerCase() : '';
    if (!name || name.length > 120 || !key || !/^[a-z0-9-]{1,100}$/.test(key)) {
      throw new BadRequestException('INVALID_ROADMAP_TOPIC');
    }
    const field = await this.ensureField();
    const existing = await this.db.metadataOption.findUnique({
      where: { fieldId_key: { fieldId: field.id, key } },
    });
    if (existing) throw new ConflictException('ROADMAP_TOPIC_ALREADY_EXISTS');
    if (input.parentId)
      return this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "MetadataField" WHERE id = ${field.id} FOR UPDATE`;
        const parent = await tx.metadataOption.findFirst({
          where: { id: input.parentId!, fieldId: field.id, parentId: null },
        });
        if (!parent) throw new BadRequestException('PARENT_MUST_BE_A_ROOT_ROADMAP_TOPIC');
        return tx.metadataOption.create({
          data: { fieldId: field.id, key, name, parentId: parent.id },
        });
      });
    return this.db.metadataOption.create({ data: { fieldId: field.id, key, name } });
  }

  async updateTopic(id: string, input: { parentId?: string | null }) {
    if (input.parentId !== null && typeof input.parentId !== 'string')
      throw new BadRequestException('INVALID_ROADMAP_PARENT');
    const field = await this.ensureField();
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MetadataField" WHERE id = ${field.id} FOR UPDATE`;
      const topic = await tx.metadataOption.findFirst({
        where: { id, fieldId: field.id },
        include: { _count: { select: { children: true } } },
      });
      if (!topic) throw new BadRequestException('ROADMAP_TOPIC_NOT_FOUND');
      if (input.parentId) {
        const parent = await tx.metadataOption.findFirst({
          where: { id: input.parentId!, fieldId: field.id, parentId: null },
        });
        if (!parent || parent.id === id || topic._count.children > 0)
          throw new BadRequestException('PARENT_MUST_BE_A_ROOT_ROADMAP_TOPIC');
      }
      return tx.metadataOption.update({ where: { id }, data: { parentId: input.parentId } });
    });
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
        parentId: option.parentId ?? null,
        publishedVideoCount: await this.db.video.count({
          where: {
            published: true,
            metadataValues: {
              some: { option: { OR: [{ id: option.id }, { parentId: option.id }] } },
            },
          },
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
        assessmentMappings.set(option.skillKey, (assessmentMappings.get(option.skillKey) ?? 0) + 1);
      }
    }
    const enrichedTopics = await Promise.all(
      topics.map(async (topic) => ({
        ...topic,
        draftVideoCount: await this.db.video.count({
          where: {
            published: false,
            metadataValues: {
              some: { option: { OR: [{ id: topic.id }, { parentId: topic.id }] } },
            },
          },
        }),
        assessmentMappingCount:
          assessmentMappings.get(topic.key) ??
          assessmentMappings.get(
            topics.find((parent) => parent.id === topic.parentId)?.key ?? '',
          ) ??
          0,
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
