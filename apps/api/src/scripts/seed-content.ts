import { Discipline, PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const course = await db.course.upsert({
    where: { key: 'top-game-takedown-submission' },
    update: { published: false },
    create: {
      key: 'top-game-takedown-submission',
      title: 'Top Game - Takedown to Submission',
      description: 'A short, branch-aware path from standing entry to a controlled finish.',
      discipline: Discipline.NO_GI_GRAPPLING,
      published: false,
    },
  });
  const courseModule = await db.courseModule.upsert({
    where: { courseId_key: { courseId: course.id, key: 'main-chain' } },
    update: {},
    create: { courseId: course.id, key: 'main-chain', title: 'Main chain', position: 0 },
  });
  const lessons = [
    [
      'standing-entry',
      'Standing entry',
      'Connect your first takedown safely.',
      'standing-entry-demo',
    ],
    [
      'pass-to-control',
      'Pass to side control',
      'Stabilise top position after the takedown.',
      'pass-to-control-demo',
    ],
    [
      'arm-triangle-finish',
      'Arm triangle finish',
      'Finish without losing control.',
      'arm-triangle-finish-demo',
    ],
  ] as const;
  const created: Record<string, string> = {};
  for (const [key, title, goal, storageKey] of lessons) {
    const video = await db.video.upsert({
      where: { id: `seed-${key}` },
      update: { title, description: goal, storageKey, published: false },
      create: { id: `seed-${key}`, title, description: goal, storageKey, published: false },
    });
    const lesson = await db.lesson.upsert({
      where: { moduleId_key: { moduleId: courseModule.id, key } },
      update: { title, goal, videoId: video.id },
      create: {
        moduleId: courseModule.id,
        videoId: video.id,
        key,
        title,
        goal,
        position: lessons.findIndex((item) => item[0] === key),
        reactions: [],
        published: false,
      },
    });
    created[key] = lesson.id;
  }

  const primary = await db.lessonRelation.findFirst({
    where: {
      fromLessonId: created['standing-entry']!,
      toLessonId: created['pass-to-control']!,
      type: 'PRIMARY',
    },
  });
  if (!primary)
    await db.lessonRelation.create({
      data: {
        fromLessonId: created['standing-entry']!,
        toLessonId: created['pass-to-control']!,
        type: 'PRIMARY',
      },
    });

  const reaction = await db.branchTrigger.upsert({
    where: { key: 'opponent-reaction' },
    update: {},
    create: { key: 'opponent-reaction', name: 'Opponent reaction' },
  });
  const branch = await db.lessonRelation.findFirst({
    where: {
      fromLessonId: created['pass-to-control']!,
      toLessonId: created['arm-triangle-finish']!,
      type: 'BRANCH',
      triggerId: reaction.id,
    },
  });
  if (!branch)
    await db.lessonRelation.create({
      data: {
        fromLessonId: created['pass-to-control']!,
        toLessonId: created['arm-triangle-finish']!,
        type: 'BRANCH',
        triggerId: reaction.id,
        condition: 'Opponent frames with the near arm.',
      },
    });

  console.log(`Seeded course ${course.key} with ${lessons.length} draft lessons.`);
}

main().finally(() => db.$disconnect());
