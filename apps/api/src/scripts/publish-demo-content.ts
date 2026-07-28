import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const course = await db.course.update({ where: { key: 'top-game-takedown-submission' }, data: { published: true, modules: { updateMany: { where: {}, data: {} } } }, include: { modules: true } });
  for (const module of course.modules) {
    const lessons = await db.lesson.findMany({ where: { moduleId: module.id }, select: { videoId: true } });
    await db.lesson.updateMany({ where: { moduleId: module.id }, data: { published: true } });
    await db.video.updateMany({ where: { id: { in: lessons.map((lesson) => lesson.videoId) } }, data: { published: true } });
  }
  console.log(`Published ${course.key}`);
}
main().finally(() => db.$disconnect());