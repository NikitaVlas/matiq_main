export type SpecializationGroup = {
  parentKey: string;
  title: string;
  discipline: string;
  options: { key: string; title: string; publishedVideoCount: number }[];
};

export function specializationFor(
  groups: SpecializationGroup[],
  skillKey: string | null,
  discipline: string,
) {
  return groups.find(
    (group) =>
      group.discipline === discipline &&
      (group.parentKey === skillKey || group.options.some((option) => option.key === skillKey)),
  );
}

type GroupableItem = {
  id: string;
  skillKey: string | null;
  lessonId: string | null;
  discipline: string;
  position: number;
  isHidden: boolean;
  completedAt: Date | null;
  recommendationType: 'GAP' | 'CORE' | 'EXPLORE';
};

// Recommendation reasons are signals for a single target, not separate skills.
export function consolidateRoadmap<T extends GroupableItem>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = JSON.stringify([item.discipline, item.skillKey ?? item.id, item.lessonId]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const reasonPriority = { GAP: 0, CORE: 1, EXPLORE: 2 };
  const statePriority = (item: T) => (item.isHidden ? 2 : item.completedAt ? 1 : 0);
  return [...groups.values()]
    .map((group) => {
      const representative = [...group].sort(
        (a, b) =>
          statePriority(a) - statePriority(b) ||
          reasonPriority[a.recommendationType] - reasonPriority[b.recommendationType] ||
          a.position - b.position,
      )[0]!;
      return {
        ...representative,
        position: Math.min(...group.map((item) => item.position)),
        recommendationTypes: [...new Set(group.map((item) => item.recommendationType))],
        relatedItemIds: group.map((item) => item.id),
      };
    })
    .sort((a, b) => a.position - b.position);
}
