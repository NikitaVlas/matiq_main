import { Discipline, type Prisma } from '@prisma/client';
import type { CatalogQueryDto } from '../dto/catalog-query.dto';

const techniquePaths = (where: Prisma.TechniqueWhereInput): Prisma.VideoWhereInput => ({
  OR: [{ technique: where }, { variant: { technique: where } }, { drill: { technique: where } }],
});
const positionPaths = (where: Prisma.PositionWhereInput): Prisma.VideoWhereInput => ({
  OR: [{ position: where }, techniquePaths({ skillGroup: { position: where } })],
});
export const publicTrainer = {
  deletedAt: null,
  role: 'TRAINER' as const,
  trainerProfile: { published: true },
};
export function disciplineWhere(value: string): Prisma.VideoWhereInput {
  if (value !== Discipline.BJJ_GI && value !== Discipline.NO_GI_GRAPPLING)
    return { id: { in: [] } };
  return {
    OR: [
      { variant: { discipline: value } },
      { Lesson: { published: true, module: { course: { published: true, discipline: value } } } },
      {
        metadataValues: {
          some: {
            option: {
              field: { key: 'discipline' },
              key: {
                in:
                  value === 'BJJ_GI'
                    ? ['bjj-gi', 'BJJ_GI']
                    : ['no-gi', 'no-gi-grappling', 'NO_GI_GRAPPLING'],
              },
            },
          },
        },
      },
    ],
  };
}
export function catalogWhere(query: CatalogQueryDto): Prisma.VideoWhereInput {
  const and: Prisma.VideoWhereInput[] = [{ published: true }];
  if (query.id) and.push({ id: query.id });
  if (query.disciplines) and.push(disciplineWhere(query.disciplines));
  if (query.trainer)
    and.push({
      trainer: { ...publicTrainer, trainerProfile: { published: true, slug: query.trainer } },
    });
  if (query.gameAreas) and.push(positionPaths({ gameAreaId: query.gameAreas }));
  if (query.positions) and.push(positionPaths({ id: query.positions }));
  if (query.skillGroups) and.push(techniquePaths({ skillGroupId: query.skillGroups }));
  if (query.techniques) and.push(techniquePaths({ id: query.techniques }));
  if (query.movements)
    and.push({ OR: [{ movementId: query.movements }, { drill: { movementId: query.movements } }] });
  if (query.drills) and.push({ drillId: query.drills });
  const search = query.q?.trim();
  if (search) {
    const contains = search.replace(/[\\%_]/g, '\\$&');
    const text = { contains, mode: 'insensitive' as const };
    and.push({
      OR: [
        { title: text },
        { description: text },
        { trainer: { ...publicTrainer, trainerProfile: { published: true, displayName: text } } },
      ],
    });
  }
  return { AND: and };
}

const attached = { some: { published: true } };
export const usedTechnique: Prisma.TechniqueWhereInput = {
  OR: [
    { videos: attached },
    { variants: { some: { videos: attached } } },
    { drills: { some: { videos: attached } } },
  ],
};
export const usedGroup: Prisma.SkillGroupWhereInput = { techniques: { some: usedTechnique } };
export const usedMovement: Prisma.MovementWhereInput = {
  OR: [{ videos: attached }, { drills: { some: { videos: attached } } }],
};
