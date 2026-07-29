import { describe, expect, it } from 'vitest';
import { continuationLabel, formatDuration, getVideoTopics, progressPercent } from './lesson-state';

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

  it('explains primary and conditional continuations', () => {
    expect(
      continuationLabel({
        type: 'PRIMARY',
        lessonId: 'next',
        videoId: 'video-next',
        title: 'Pressure pass',
      }),
    ).toBe('Hauptweg');
    expect(
      continuationLabel({
        type: 'BRANCH',
        lessonId: 'branch',
        videoId: 'video-branch',
        title: 'Back take',
        trigger: 'Der Gegner dreht sich ein',
      }),
    ).toBe('Wenn: Der Gegner dreht sich ein');
  });
});
