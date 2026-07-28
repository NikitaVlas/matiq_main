import { describe, expect, it } from 'vitest';
import { validateCourseStructure } from '../src/modules/content/course-validation';

const lesson = (
  id: string,
  position: number,
  outgoingRelations: { toLessonId: string; type: 'PRIMARY' | 'BRANCH' }[] = [],
) => ({ id, title: id, position, outgoingRelations });

describe('validateCourseStructure', () => {
  it('accepts a reachable acyclic course with one primary continuation', () => {
    const report = validateCourseStructure([
      {
        position: 0,
        lessons: [lesson('lesson-a', 0, [{ toLessonId: 'lesson-b', type: 'PRIMARY' }])],
      },
      { position: 1, lessons: [lesson('lesson-b', 0)] },
    ]);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it('allows independent lessons without paths', () => {
    const report = validateCourseStructure([
      { position: 0, lessons: [lesson('lesson-a', 0), lesson('lesson-b', 1)] },
    ]);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it('reports cycles and multiple primary paths', () => {
    const report = validateCourseStructure([
      {
        position: 0,
        lessons: [
          lesson('lesson-a', 0, [
            { toLessonId: 'lesson-b', type: 'PRIMARY' },
            { toLessonId: 'lesson-c', type: 'PRIMARY' },
          ]),
          lesson('lesson-b', 1, [{ toLessonId: 'lesson-a', type: 'BRANCH' }]),
          lesson('lesson-c', 2),
        ],
      },
    ]);

    expect(report.issues.map((issue) => issue.code)).toContain('MULTIPLE_PRIMARY_PATHS');
    expect(report.issues.map((issue) => issue.code)).toContain('COURSE_CYCLE');
  });

  it('rejects a relation to a lesson outside the course', () => {
    const report = validateCourseStructure([
      {
        position: 0,
        lessons: [
          lesson('lesson-a', 0, [{ toLessonId: 'foreign-lesson', type: 'PRIMARY' }]),
          lesson('lesson-b', 1),
        ],
      },
    ]);

    expect(report.issues.map((issue) => issue.code)).toContain('RELATION_OUTSIDE_COURSE');
  });
});
