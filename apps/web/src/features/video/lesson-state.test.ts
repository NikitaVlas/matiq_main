import { describe, expect, it } from 'vitest';
import {
  continuationLabel,
  formatDuration,
  getVideoTopics,
  markCurrentLessonCompleted,
  progressPercent,
  type CourseContext,
} from './lesson-state';

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

  it('marks only the current course lesson as completed', () => {
    const context = {
      course: { id: 'course', title: 'Top Game', discipline: 'BJJ' },
      module: { id: 'module', title: 'Passing' },
      currentLesson: { id: 'current', title: 'Pressure pass', position: 0 },
      lessons: [
        {
          id: 'current',
          videoId: 'video-1',
          title: 'Pressure pass',
          position: 0,
          watchedSeconds: 60,
          completed: false,
          current: true,
        },
        {
          id: 'next',
          videoId: 'video-2',
          title: 'Control',
          position: 1,
          watchedSeconds: 0,
          completed: false,
          current: false,
        },
      ],
      continuations: [],
    } satisfies CourseContext;

    const updated = markCurrentLessonCompleted(context, 80);

    expect(updated?.lessons[0]).toMatchObject({ watchedSeconds: 80, completed: true });
    expect(updated?.lessons[1]).toEqual(context.lessons[1]);
    expect(context.lessons[0]?.completed).toBe(false);
  });
});
