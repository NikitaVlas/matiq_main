import { describe, expect, it } from 'vitest';
import { Course, Roadmap, selectDashboardContent } from './dashboard-state';

const giRoadmap: Roadmap = {
  discipline: 'BJJ_GI',
  items: [
    {
      id: 'step-1',
      title: 'Guard passing',
      videos: [
        { id: 'video-next', title: 'Next' },
        { id: 'video-extra', title: 'Extra' },
      ],
    },
  ],
  completedItems: [],
  hiddenItems: [],
};

const courses: Course[] = [
  {
    id: 'course-gi',
    title: 'Gi course',
    discipline: 'BJJ_GI',
    createdAt: '2026-01-01T00:00:00.000Z',
    modules: [],
  },
  {
    id: 'course-no-gi',
    title: 'No-Gi course',
    discipline: 'NO_GI_GRAPPLING',
    createdAt: '2026-02-01T00:00:00.000Z',
    modules: [],
  },
];

describe('dashboard state', () => {
  it('selects content for the active discipline and excludes the primary video from suggestions', () => {
    const content = selectDashboardContent([giRoadmap], 'BJJ_GI', [], courses);

    expect(content.roadmap).toBe(giRoadmap);
    expect(content.recommendedCourses.map((course) => course.id)).toEqual(['course-gi']);
    expect(content.suggestedVideos).toEqual([{ id: 'video-extra', title: 'Extra' }]);
  });

  it('returns stable empty states without a Roadmap', () => {
    const content = selectDashboardContent([], undefined, [], []);

    expect(content.roadmap).toBeUndefined();
    expect(content.continueVideo).toBeUndefined();
    expect(content.recommendedCourses).toEqual([]);
    expect(content.suggestedVideos).toEqual([]);
  });
});
