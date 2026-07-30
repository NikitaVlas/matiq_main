import { Inject, Injectable } from '@nestjs/common';
import { Belt, Discipline, RoadmapItemSource, RoadmapRecommendationType } from '@prisma/client';
import { Database } from '../../../shared/infrastructure/database';

type BeginnerProfile = {
  id: string;
  belt: Belt | null;
  experienceYears: number;
  experienceMonths: number | null;
  disciplines: Discipline[];
};

@Injectable()
export class FoundationRoadmapService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async assignIfEligible(profile: BeginnerProfile) {
    const experienceMonths = profile.experienceMonths ?? profile.experienceYears * 12;
    if (profile.belt !== Belt.WHITE || experienceMonths > 6) return { assigned: false };

    const templates = await this.db.foundationTemplate.findMany({
      where: {
        active: true,
        belt: profile.belt,
        discipline: { in: profile.disciplines },
        minExperienceMonths: { lte: experienceMonths },
        maxExperienceMonths: { gte: experienceMonths },
      },
      include: { steps: { where: { active: true }, orderBy: { position: 'asc' } } },
    });

    const operations = templates.flatMap((template) =>
      template.steps.map((step) =>
        this.db.roadmapItem.upsert({
          where: {
            athleteProfileId_foundationStepId: {
              athleteProfileId: profile.id,
              foundationStepId: step.id,
            },
          },
          create: {
            athleteProfileId: profile.id,
            discipline: template.discipline,
            type: 'SKILL_GROUP',
            title: step.title,
            skillKey: step.skillKey,
            position: -1000 + step.position,
            source: RoadmapItemSource.FOUNDATION,
            foundationStepId: step.id,
            recommendationType: RoadmapRecommendationType.GAP,
          },
          update: { title: step.title, skillKey: step.skillKey },
        }),
      ),
    );
    if (operations.length) await this.db.$transaction(operations);
    return { assigned: operations.length > 0 };
  }
}
