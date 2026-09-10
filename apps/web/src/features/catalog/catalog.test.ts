import { describe, expect, it } from 'vitest';
import { type CatalogVideo, filterOptions, filterVideos } from './catalog';
const video: CatalogVideo = {
  id: 'one',
  title: 'Guard Sweep',
  description: 'Präzise Bewegung',
  durationSec: 120,
  createdAt: '2026-01-01T00:00:00Z',
  disciplines: ['BJJ_GI'],
  trainer: { slug: 'lea', displayName: 'Lea' },
  gameAreas: [],
  positions: [{ id: 'guard', name: 'Guard' }],
  skillGroups: [],
  techniques: [],
  movements: [],
  drills: [],
};
describe('video catalog filters', () => {
  it('combines filters and normalized search with AND semantics', () => {
    expect(
      filterVideos(
        [video],
        { disciplines: 'BJJ_GI', trainer: 'lea', positions: 'guard' },
        ' SWEEP ',
      ),
    ).toEqual([video]);
    expect(filterVideos([video], { disciplines: 'NO_GI_GRAPPLING' }, 'Sweep')).toEqual([]);
    expect(filterVideos([video], { trainer: 'missing' }, '')).toEqual([]);
  });
  it('deduplicates filter options without manufacturing missing values', () => {
    expect(filterOptions([video, { ...video, id: 'two' }], 'positions')).toEqual([
      { id: 'guard', name: 'Guard' },
    ]);
    expect(filterOptions([video], 'drills')).toEqual([]);
  });
});
