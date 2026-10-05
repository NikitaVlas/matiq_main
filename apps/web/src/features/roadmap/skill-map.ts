import { selectRoadmapFocus } from './roadmap-focus';

export type RoadmapItem = {
  id: string;
  title: string;
  skillKey?: string | null;
  source?: string;
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

export function buildSkillMap(items: RoadmapItem[], completed: RoadmapItem[]) {
  const focus = selectRoadmapFocus(items);
  const nextIds = new Set(focus.next.map((item) => item.id));
  const completedIds = new Set(completed.map((item) => item.id));
  const nodes = [...items, ...completed].map((item) => ({
    item,
    stage: (completedIds.has(item.id)
      ? 'completed'
      : item.id === focus.primary?.id
        ? 'now'
        : nextIds.has(item.id)
          ? 'next'
          : 'later') as PlanStage,
    branch:
      branches.find((branch) => branch.skills.includes(item.skillKey ?? ''))?.key ??
      (item.source === 'FOUNDATION' ? 'foundation' : 'other'),
  }));
  return {
    focus,
    branches: branches
      .map((branch) => ({ ...branch, nodes: nodes.filter((node) => node.branch === branch.key) }))
      .filter((branch) => branch.nodes.length),
  };
}
