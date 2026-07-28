import { PrismaClient, Discipline } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const course = await db.course.upsert({ where: { key: 'top-game-takedown-submission' }, update: { published: false }, create: { key: 'top-game-takedown-submission', title: 'Top Game — Takedown to Submission', description: 'A short, branch-aware path from standing entry to a controlled finish.', discipline: Discipline.NO_GI_GRAPPLING, published: false } });
  const module = await db.courseModule.upsert({ where: { courseId_key: { courseId: course.id, key: 'main-chain' } }, update: {}, create: { courseId: course.id, key: 'main-chain', title: 'Main chain', position: 0 } });
  const lessons = [
    ['standing-entry', 'Standing entry', 'Connect your first takedown safely.', 'standing-entry-demo'],
    ['pass-to-control', 'Pass to side control', 'Stabilise top position after the takedown.', 'pass-to-control-demo'],
    ['arm-triangle-finish', 'Arm triangle finish', 'Finish without losing control.', 'arm-triangle-finish-demo'],
  ] as const;
  const created: Record<string, string> = {};
  for (const [key, title, goal, storageKey] of lessons) {
    const video = await db.video.upsert({ where: { id: `seed-${key}` }, update: { title, description: goal, storageKey, published: false }, create: { id: `seed-${key}`, title, description: goal, storageKey, published: false } });
    const lesson = await db.lesson.upsert({ where: { moduleId_key: { moduleId: module.id, key } }, update: { title, goal, videoId: video.id }, create: { moduleId: module.id, videoId: video.id, key, title, goal, position: lessons.findIndex((item) => item[0] === key), reactions: [], published: false } });
    created[key] = lesson.id;
  }
  await db.lessonRelation.upsert({ where: { fromLessonId_toLessonId_type: { fromLessonId: created['standing-entry']!, toLessonId: created['pass-to-control']!, type: 'NEXT' } }, update: {}, create: { fromLessonId: created['standing-entry']!, toLessonId: created['pass-to-control']!, type: 'NEXT' } });
  await db.lessonRelation.upsert({ where: { fromLessonId_toLessonId_type: { fromLessonId: created['pass-to-control']!, toLessonId: created['arm-triangle-finish']!, type: 'REACTION' } }, update: {}, create: { fromLessonId: created['pass-to-control']!, toLessonId: created['arm-triangle-finish']!, type: 'REACTION', condition: 'Opponent frames with the near arm.' } });
  console.log(`Seeded course ${course.key} with ${lessons.length} draft lessons.`);
}

main().finally(() => db.$disconnect());