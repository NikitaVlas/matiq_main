import { selectRoadmapFocus } from './roadmap-focus';

export type RoadmapItem = {
  id: string;
  title: string;
  skillKey?: string | null;
  source?: string;
  lessonId?: string | null;
  relatedItemIds?: string[];
  recommendationTypes?: ('CORE' | 'GAP' | 'EXPLORE')[];
  completedAt?: string | null;
  recommendationType: 'CORE' | 'GAP' | 'EXPLORE';
  videos?: { id: string; title: string }[];
  progress?: {
    completedVideos: number;
    totalVideos: number;
    percent: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  };
};

export type SkillChoice = {
  parentKey: string;
  title: string;
  options: { key: string; title: string; publishedVideoCount?: number }[];
};

export function uniqueRoadmapItems(items: RoadmapItem[]) {
  const groups = new Map<string, RoadmapItem[]>();
  for (const item of items) {
    const key = JSON.stringify([item.skillKey ?? item.id, item.lessonId ?? null]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((group) => ({
    ...(group.find((item) => item.recommendationType === 'GAP') ?? group[0]!),
    relatedItemIds: [...new Set(group.flatMap((item) => item.relatedItemIds ?? [item.id]))],
    recommendationTypes: [
      ...new Set(group.flatMap((item) => item.recommendationTypes ?? [item.recommendationType])),
    ],
  }));
}

export type PlanStage = 'now' | 'next' | 'later' | 'completed';
export const stageLabels: Record<PlanStage, string> = {
  now: 'Jetzt',
  next: 'Danach',
  later: 'Später',
  completed: 'Abgeschlossen',
};

const branches = [
  {
    key: 'top',
    title: 'Top Game',
    description: 'In die Top-Position kommen und sie halten.',
    skills: [
      'standing',
      'takedowns',
      'guard-passing',
      'top-control',
      'mount-top',
      'side-control-top',
    ],
  },
  {
    key: 'guard',
    title: 'Guard Game',
    description: 'Von unten kontrollieren und angreifen.',
    skills: ['closed-guard', 'open-guard'],
  },
  {
    key: 'escapes',
    title: 'Escapes',
    description: 'Raum schaffen und Positionen zurückgewinnen.',
    skills: ['bottom-escape', 'mount-bottom'],
  },
  {
    key: 'foundation',
    title: 'Grundlagen',
    description: 'Die Basis für dein Training.',
    skills: [],
  },
  {
    key: 'other',
    title: 'Weitere Skills',
    description: 'Weitere Themen in deinem persönlichen Plan.',
    skills: [],
  },
];

export function buildSkillMap(
  rawItems: RoadmapItem[],
  rawCompleted: RoadmapItem[],
  choices: SkillChoice[] = [],
) {
  const items = uniqueRoadmapItems(rawItems);
  const activeKeys = new Set(
    items.map((item) => JSON.stringify([item.skillKey ?? item.id, item.lessonId ?? null])),
  );
  const completed = uniqueRoadmapItems(rawCompleted).filter(
    (item) => !activeKeys.has(JSON.stringify([item.skillKey ?? item.id, item.lessonId ?? null])),
  );
  const focus = selectRoadmapFocus(items);
  const nextIds = new Set(focus.next.map((item) => item.id));
  const completedIds = new Set(completed.map((item) => item.id));
  const nodes = [...items, ...completed].map((item) => {
    const choice = choices.find(
      (group) =>
        group.parentKey === item.skillKey ||
        group.options.some((option) => option.key === item.skillKey),
    );
    return {
      item,
      choice,
      stage: (completedIds.has(item.id)
        ? 'completed'
        : item.id === focus.primary?.id
          ? 'now'
          : nextIds.has(item.id)
            ? 'next'
            : 'later') as PlanStage,
      branch:
        branches.find((branch) => branch.skills.includes(choice?.parentKey ?? item.skillKey ?? ''))
          ?.key ?? (item.source === 'FOUNDATION' ? 'foundation' : 'other'),
    };
  });
  return {
    focus,
    branches: branches
      .map((branch) => ({ ...branch, nodes: nodes.filter((node) => node.branch === branch.key) }))
      .filter((branch) => branch.nodes.length),
  };
}
