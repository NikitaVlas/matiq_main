import type { Prisma } from '@prisma/client';
import type { CatalogVideoDto, CatalogFacetDto } from '../dto/catalog-video.dto';

const positionSelect = {
  id: true,
  name: true,
  gameArea: { select: { id: true, name: true } },
} as const;
const techniqueSelect = {
  id: true,
  name: true,
  skillGroup: {
    select: {
      id: true,
      name: true,
      position: { select: positionSelect },
    },
  },
} as const;

export const publicVideoSelect = {
  id: true,
  title: true,
  description: true,
  durationSec: true,
  createdAt: true,
  position: { select: positionSelect },
  technique: { select: techniqueSelect },
  variant: { select: { discipline: true, technique: { select: techniqueSelect } } },
  movement: { select: { id: true, name: true } },
  drill: {
    select: {
      id: true,
      name: true,
      technique: { select: techniqueSelect },
      movement: { select: { id: true, name: true } },
    },
  },
  trainer: {
    select: {
      deletedAt: true,
      role: true,
      trainerProfile: { select: { published: true, slug: true, displayName: true } },
    },
  },
  Lesson: {
    select: {
      published: true,
      module: { select: { course: { select: { published: true, discipline: true } } } },
    },
  },
  metadataValues: {
    select: { option: { select: { key: true, field: { select: { key: true } } } } },
  },
} satisfies Prisma.VideoSelect;

type Row = Prisma.VideoGetPayload<{ select: typeof publicVideoSelect }>;
function facets(items: (CatalogFacetDto | null | undefined)[]): CatalogFacetDto[] {
  return [
    ...new Map(
      items
        .filter((item): item is CatalogFacetDto => Boolean(item))
        .map(({ id, name }) => [id, { id, name }]),
    ).values(),
  ];
}
export function publicVideoSummary(row: Row): CatalogVideoDto {
  const techniques = [row.technique, row.variant?.technique, row.drill?.technique].filter(
    (x) => x != null,
  );
  const groups = techniques.map((x) => x.skillGroup);
  const positions = [row.position, ...groups.map((x) => x.position)].filter((x) => x != null);
  const profile = row.trainer?.trainerProfile;
  const disciplines = new Set<string>();
  if (row.variant) disciplines.add(row.variant.discipline);
  if (row.Lesson?.published && row.Lesson.module.course.published)
    disciplines.add(row.Lesson.module.course.discipline);
  for (const { option } of row.metadataValues) {
    if (option.field.key !== 'discipline') continue;
    if (['bjj-gi', 'BJJ_GI'].includes(option.key)) disciplines.add('BJJ_GI');
    if (['no-gi', 'no-gi-grappling', 'NO_GI_GRAPPLING'].includes(option.key))
      disciplines.add('NO_GI_GRAPPLING');
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationSec: row.durationSec,
    createdAt: row.createdAt,
    disciplines: [...disciplines],
    trainer:
      profile?.published && row.trainer?.role === 'TRAINER' && !row.trainer.deletedAt
        ? { slug: profile.slug, displayName: profile.displayName }
        : null,
    gameAreas: facets(positions.map((x) => x.gameArea)),
    positions: facets(positions),
    skillGroups: facets(groups),
    techniques: facets(techniques),
    movements: facets([row.movement, row.drill?.movement]),
    drills: facets([row.drill]),
  };
}
