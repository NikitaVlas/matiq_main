import { describe, expect, it } from 'vitest';
import { buildSkillMap, type RoadmapItem } from './skill-map';

const item = (
  id: string,
  skillKey: string,
  recommendationType: RoadmapItem['recommendationType'] = 'GAP',
): RoadmapItem => ({ id, skillKey, title: id, recommendationType });

describe('skill map', () => {
  it('shows one node per skill while retaining reasons and the current focus policy', () => {
    const items = [
      item('guard', 'open-guard'),
      item('top', 'top-control', 'CORE'),
      item('stand', 'standing'),
      item('mount', 'mount-top'),
      item('goal', 'top-control', 'EXPLORE'),
    ];
    const map = buildSkillMap(items, [item('done', 'bottom-escape')]);
    const nodes = map.branches.flatMap((branch) => branch.nodes);
    expect(nodes).toHaveLength(5);
    expect(nodes.filter((node) => node.stage === 'now').map((node) => node.item.id)).toEqual([
      'guard',
    ]);
    expect(
      new Set(nodes.filter((node) => node.stage === 'next').map((node) => node.item.id)),
    ).toEqual(new Set(['stand', 'top']));
    expect(map.branches.find((branch) => branch.key === 'top')?.nodes).toHaveLength(3);
    expect(nodes.find((node) => node.item.id === 'top')?.item.recommendationTypes).toEqual([
      'CORE',
      'EXPLORE',
    ]);
    expect(nodes.find((node) => node.item.id === 'done')?.stage).toBe('completed');
    expect(items.map((node) => node.id)).toEqual(['guard', 'top', 'stand', 'mount', 'goal']);
  });

  it('never repeats an active skill as later or completed and nests selected skills in the parent branch', () => {
    const map = buildSkillMap(
      [item('one', 'open-guard', 'EXPLORE'), item('two', 'open-guard')],
      [item('old', 'open-guard')],
    );
    expect(map.branches.flatMap((branch) => branch.nodes)).toHaveLength(1);
    expect(map.focus.primary?.id).toBe('two');
    const specialized = buildSkillMap(
      [item('spider', 'spider-guard')],
      [],
      [
        {
          parentKey: 'open-guard',
          title: 'Offene Guard',
          options: [{ key: 'spider-guard', title: 'Spider Guard' }],
        },
      ],
    );
    expect(specialized.branches[0]?.key).toBe('guard');
    expect(specialized.branches[0]?.nodes[0]?.choice?.parentKey).toBe('open-guard');
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
