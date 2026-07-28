type RelationInput = { toLessonId: string; type: 'PRIMARY' | 'BRANCH' };
type LessonInput = {
  id: string;
  title: string;
  position: number;
  outgoingRelations: RelationInput[];
};
type ModuleInput = { position: number; lessons: LessonInput[] };

export type CourseValidationIssue = {
  code: 'COURSE_EMPTY' | 'COURSE_CYCLE' | 'MULTIPLE_PRIMARY_PATHS' | 'RELATION_OUTSIDE_COURSE';
  message: string;
  lessonId?: string;
};

export const validateCourseStructure = (modules: ModuleInput[]) => {
  const lessons = [...modules]
    .sort((left, right) => left.position - right.position)
    .flatMap((module) => [...module.lessons].sort((left, right) => left.position - right.position));
  const issues: CourseValidationIssue[] = [];

  if (lessons.length === 0) {
    return {
      valid: false,
      issues: [{ code: 'COURSE_EMPTY', message: 'Add at least one lesson before publishing.' }],
    };
  }

  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const adjacency = new Map<string, string[]>();

  for (const lesson of lessons) {
    const primaryPaths = lesson.outgoingRelations.filter((relation) => relation.type === 'PRIMARY');
    if (primaryPaths.length > 1) {
      issues.push({
        code: 'MULTIPLE_PRIMARY_PATHS',
        lessonId: lesson.id,
        message: `Lesson "${lesson.title}" has more than one primary path.`,
      });
    }

    const targets: string[] = [];
    for (const relation of lesson.outgoingRelations) {
      if (!lessonIds.has(relation.toLessonId)) {
        issues.push({
          code: 'RELATION_OUTSIDE_COURSE',
          lessonId: lesson.id,
          message: `Lesson "${lesson.title}" links outside this course.`,
        });
      } else {
        targets.push(relation.toLessonId);
      }
    }
    adjacency.set(lesson.id, targets);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (lessonId: string): boolean => {
    if (visiting.has(lessonId)) return true;
    if (visited.has(lessonId)) return false;
    visiting.add(lessonId);
    for (const targetId of adjacency.get(lessonId) ?? []) {
      if (hasCycle(targetId)) return true;
    }
    visiting.delete(lessonId);
    visited.add(lessonId);
    return false;
  };
  if (lessons.some((lesson) => hasCycle(lesson.id))) {
    issues.push({ code: 'COURSE_CYCLE', message: 'Lesson paths contain a cycle.' });
  }

  return { valid: issues.length === 0, issues };
};
