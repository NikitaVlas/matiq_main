import { describe, expect, it } from 'vitest';
import { selectRoadmapFocus, type FocusableRoadmapItem } from './roadmap-focus';

const item = (
  id: string,
  recommendationType: FocusableRoadmapItem['recommendationType'],
  hasContent = false,
): FocusableRoadmapItem => ({
  id,
  recommendationType,
  videos: hasContent ? [{ id: `video-${id}`, title: id }] : [],
});

describe('selectRoadmapFocus', () => {
  it('limits the active plan to one focus and two next topics', () => {
    const items = Array.from({ length: 20 }, (_, index) => item(`gap-${index}`, 'GAP'));
    const result = selectRoadmapFocus(items);

    expect(result.primary?.id).toBe('gap-0');
    expect(result.next).toHaveLength(2);
    expect(result.backlog).toHaveLength(17);
  });

  it('prefers an actionable gap and balances the next topics', () => {
    const result = selectRoadmapFocus([
      item('gap-without-content', 'GAP'),
      item('core', 'CORE'),
      item('explore', 'EXPLORE'),
      item('gap-with-content', 'GAP', true),
      item('supporting-gap', 'GAP'),
    ]);

    expect(result.primary?.id).toBe('gap-with-content');
    expect(result.next.map(({ id }) => id)).toEqual(['gap-without-content', 'core']);
    expect(result.backlog.map(({ id }) => id)).toEqual(['explore', 'supporting-gap']);
  });
});
