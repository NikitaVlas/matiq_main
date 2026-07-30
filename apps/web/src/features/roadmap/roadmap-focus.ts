export type FocusableRoadmapItem = {
  id: string;
  recommendationType: 'CORE' | 'GAP' | 'EXPLORE';
  videos?: { id: string; title: string }[];
};

export function selectRoadmapFocus<T extends FocusableRoadmapItem>(items: T[]) {
  const remaining = [...items];
  const take = (predicate: (item: T) => boolean) => {
    const index = remaining.findIndex(predicate);
    return index < 0 ? undefined : remaining.splice(index, 1)[0];
  };

  const primary =
    take((item) => item.recommendationType === 'GAP' && Boolean(item.videos?.length)) ??
    take((item) => item.recommendationType === 'GAP') ??
    take((item) => Boolean(item.videos?.length)) ??
    remaining.shift();

  const next = [
    take((item) => item.recommendationType === 'GAP'),
    take((item) => item.recommendationType === 'CORE'),
    take((item) => item.recommendationType === 'EXPLORE'),
  ].filter((item): item is T => Boolean(item));

  while (next.length < 2 && remaining.length) next.push(remaining.shift()!);

  return {
    primary,
    next: next.slice(0, 2),
    backlog: [...next.slice(2), ...remaining],
  };
}
