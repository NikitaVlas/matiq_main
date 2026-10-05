import { describe, expect, it } from 'vitest';
import { buildSkillMap, type RoadmapItem } from './skill-map';

const item = (
  id: string,
  skillKey: string,
  recommendationType: RoadmapItem['recommendationType'] = 'GAP',
): RoadmapItem => ({ id, skillKey, title: id, recommendationType });

describe('skill map', () => {
  it('preserves every recommendation, including duplicate skills, and the current focus policy', () => {
    const items = [
      item('guard', 'open-guard'),
      item('top', 'top-control', 'CORE'),
      item('stand', 'standing'),
      item('mount', 'mount-top'),
      item('goal', 'top-control', 'EXPLORE'),
    ];
    const map = buildSkillMap(items, [item('done', 'bottom-escape')]);
    const nodes = map.branches.flatMap((branch) => branch.nodes);
    expect(nodes).toHaveLength(6);
    expect(nodes.filter((node) => node.stage === 'now').map((node) => node.item.id)).toEqual([
      'guard',
    ]);
    expect(
      new Set(nodes.filter((node) => node.stage === 'next').map((node) => node.item.id)),
    ).toEqual(new Set(['stand', 'top']));
    expect(map.branches.find((branch) => branch.key === 'top')?.nodes).toHaveLength(4);
    expect(nodes.find((node) => node.item.id === 'done')?.stage).toBe('completed');
    expect(items.map((node) => node.id)).toEqual(['guard', 'top', 'stand', 'mount', 'goal']);
  });

  it('keeps unknown skills and foundation steps without creating missing recommendations', () => {
    const map = buildSkillMap(
      [item('custom', 'new-editor-skill'), { ...item('base', 'movement'), source: 'FOUNDATION' }],
      [],
    );
    expect(map.branches.map((branch) => branch.key)).toEqual(['foundation', 'other']);
    expect(map.branches.flatMap((branch) => branch.nodes).map((node) => node.item.id)).toEqual([
      'base',
      'custom',
    ]);
    expect(buildSkillMap([], []).branches).toEqual([]);
  });
});
