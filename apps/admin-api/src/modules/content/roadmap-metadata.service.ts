import { Injectable } from '@nestjs/common';
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
}
