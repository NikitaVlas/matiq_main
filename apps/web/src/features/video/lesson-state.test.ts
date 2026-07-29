import { describe, expect, it } from 'vitest';
import { formatDuration, getVideoTopics, progressPercent } from './lesson-state';

describe('lesson state', () => {
  it('formats duration and clamps playback progress', () => {
    expect(formatDuration(125)).toBe('2:05 Min.');
    expect(formatDuration(undefined)).toBe('Nicht angegeben');
    expect(progressPercent(80, 100)).toBe(80);
    expect(progressPercent(140, 100)).toBe(100);
  });

  it('returns only configured lesson topics', () => {
    expect(
      getVideoTopics({
        title: 'Pressure Pass',
        position: { name: 'Top Guard' },
        technique: { name: 'Pressure Passing' },
        movement: null,
      }),
    ).toEqual([
      { label: 'Position', value: 'Top Guard' },
      { label: 'Technik', value: 'Pressure Passing' },
    ]);
  });
});
