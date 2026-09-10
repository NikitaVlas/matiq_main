import type { UserApiSchemas } from '@matiq/contracts';
export type CatalogVideo = UserApiSchemas['schemas']['CatalogVideoDto'];
export const filterLabels = {
  disciplines: 'Disziplin',
  trainer: 'Trainer',
  gameAreas: 'Kampfbereich',
  positions: 'Position',
  skillGroups: 'Technikgruppe',
  techniques: 'Technik',
  movements: 'Bewegung',
  drills: 'Drill',
} as const;
export type FilterKey = keyof typeof filterLabels;
export type Filters = Partial<Record<FilterKey, string>>;
export const disciplineLabel = (value: string) =>
  ({ BJJ_GI: 'BJJ Gi', NO_GI_GRAPPLING: 'No-Gi Grappling' })[value] ?? value;
export function filterOptions(videos: CatalogVideo[], key: FilterKey) {
  const all = videos.flatMap((video) =>
    key === 'disciplines'
      ? video.disciplines.map((id) => ({ id, name: disciplineLabel(id) }))
      : key === 'trainer'
        ? video.trainer
          ? [{ id: video.trainer.slug, name: video.trainer.displayName }]
          : []
        : video[key],
  );
  return [...new Map(all.map((item) => [item.id, item])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );
}
export function filterVideos(videos: CatalogVideo[], filters: Filters, query: string) {
  const search = query.trim().toLocaleLowerCase('de');
  return videos.filter(
    (video) =>
      (!search ||
        [video.title, video.description, video.trainer?.displayName]
          .join(' ')
          .toLocaleLowerCase('de')
          .includes(search)) &&
      (Object.entries(filters) as [FilterKey, string][]).every(
        ([key, value]) =>
          !value ||
          (key === 'disciplines'
            ? video.disciplines.some((discipline) => discipline === value)
            : key === 'trainer'
              ? video.trainer?.slug === value
              : video[key].some((item) => item.id === value)),
      ),
  );
}
