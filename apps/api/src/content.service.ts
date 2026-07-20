import { Inject, Injectable } from '@nestjs/common';
import { AssessmentContext, Discipline } from '@prisma/client';
import { Database } from './database';

@Injectable()
export class ContentService {
  constructor(@Inject(Database) private readonly db: Database) {}

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
