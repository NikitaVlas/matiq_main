import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Uses only a newly created local disposable database, never application .env.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'apps/api/package.json'));
require('reflect-metadata');
const { PrismaClient } = require('@prisma/client');
const { AssessmentService } = require(
  resolve(root, 'apps/api/dist/modules/assessment/application/assessment.service.js'),
);
const { RoadmapMetadataService } = require(
  resolve(root, 'apps/admin-api/dist/modules/content/roadmap-metadata.service.js'),
);
const database = `matiq_skills_${randomUUID().replaceAll('-', '')}`;
const base = 'postgresql://matiq:matiq_local@127.0.0.1:5432/';
const url = `${base}${database}`;
const admin = new PrismaClient({ datasources: { db: { url: `${base}matiq` } } });
const db = new PrismaClient({ datasources: { db: { url } } });
let created = false;
const apps = [];
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  created = true;
  execFileSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      resolve(root, 'apps/api/prisma/schema.prisma'),
    ],
    { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe', timeout: 60000 },
  );
  const editor = new RoadmapMetadataService(db);
  const athlete = new AssessmentService(db);
  const field = await editor.ensureField();
  const parent = await db.metadataOption.findUniqueOrThrow({
    where: { fieldId_key: { fieldId: field.id, key: 'open-guard' } },
  });
  const spider = await editor.createTopic({
    key: 'spider-guard',
    name: 'Spider Guard',
    parentId: parent.id,
  });
  const lasso = await editor.createTopic({ key: 'lasso-guard', name: 'Lasso Guard' });
  await editor.updateTopic(lasso.id, { parentId: parent.id });
  await assert.rejects(
    editor.updateTopic(parent.id, { parentId: spider.id }),
    /PARENT_MUST_BE_A_ROOT/,
  );
  await assert.rejects(
    editor.updateTopic(spider.id, { parentId: spider.id }),
    /PARENT_MUST_BE_A_ROOT/,
  );
  const discipline = await db.metadataField.upsert({
    where: { key: 'discipline' },
    update: {},
    create: {
      key: 'discipline',
      name: 'Discipline',
      options: {
        create: [
          { key: 'bjj-gi', name: 'BJJ Gi' },
          { key: 'no-gi', name: 'No Gi' },
        ],
      },
    },
    include: { options: true },
  });
  const gi = discipline.options.find((option) => option.key === 'bjj-gi');
  const nogi = discipline.options.find((option) => option.key === 'no-gi');
  const createVideo = (title, topic, disciplineId, published) =>
    db.video.create({
      data: {
        title,
        storageKey: 'synthetic',
        published,
        metadataValues: { create: [{ optionId: topic }, { optionId: disciplineId }] },
      },
    });
  const spiderVideo = await createVideo('Spider lesson', spider.id, gi.id, true);
  const lassoVideo = await createVideo('Lasso draft', lasso.id, gi.id, false);
  await createVideo('Lasso No Gi fixture', lasso.id, nogi.id, true);
  const user = await db.user.create({
    data: {
      email: 'skills@example.invalid',
      passwordHash: 'disabled',
      athleteProfile: {
        create: {
          disciplines: ['BJJ_GI'],
          experienceYears: 6,
          trainingSessionsPerWeek: 3,
          competitionExperience: false,
          goals: [],
        },
      },
    },
    include: { athleteProfile: true },
  });
  const scope = {
    athleteProfileId: user.athleteProfile.id,
    discipline: 'BJJ_GI',
    skillKey: 'open-guard',
    title: 'Offene Guard',
    type: 'SKILL_GROUP',
    position: 0,
  };
  const item = await db.roadmapItem.create({ data: { ...scope, recommendationType: 'GAP' } });
  await db.roadmapItem.create({ data: { ...scope, recommendationType: 'CORE' } });
  let result = await athlete.getResult(user.id);
  assert.equal(
    result.roadmaps[0].items.length,
    1,
    'recommendation reasons must not duplicate nodes',
  );
  assert.deepEqual(
    result.roadmaps[0].items[0].videos.map((video) => video.id),
    [spiderVideo.id],
  );
  assert.equal(
    result.roadmaps[0].skillChoices[0].options.find((option) => option.key === 'lasso-guard')
      .publishedVideoCount,
    0,
    'draft and other discipline cannot unlock Gi skill',
  );
  await assert.rejects(
    athlete.updateRoadmapItem(user.id, item.id, { selectedSkillKeys: ['lasso-guard'] }),
    /SKILL_HAS_NO_PUBLISHED_CONTENT/,
  );
  await db.video.update({ where: { id: lassoVideo.id }, data: { published: true } });
  result = await athlete.getResult(user.id);
  assert.equal(
    result.roadmaps[0].skillChoices[0].options.find((option) => option.key === 'lasso-guard')
      .publishedVideoCount,
    1,
  );
  await athlete.updateRoadmapItem(user.id, item.id, { selectedSkillKeys: ['spider-guard'] });
  result = await new AssessmentService(db).getResult(user.id);
  assert.deepEqual(
    result.roadmaps[0].items.map((row) => row.skillKey),
    ['spider-guard'],
  );
  assert.deepEqual(
    result.roadmaps[0].items[0].videos.map((video) => video.id),
    [spiderVideo.id],
  );
  const childId = result.roadmaps[0].items[0].id;
  const other = await db.user.create({
    data: {
      email: 'other@example.invalid',
      passwordHash: 'disabled',
      athleteProfile: {
        create: {
          disciplines: ['BJJ_GI'],
          experienceYears: 1,
          trainingSessionsPerWeek: 1,
          competitionExperience: false,
          goals: [],
        },
      },
    },
  });
  await assert.rejects(
    athlete.updateRoadmapItem(other.id, childId, { selectedSkillKeys: [] }),
    /ROADMAP_ITEM_NOT_FOUND/,
  );
  await athlete.generateRoadmap(user.athleteProfile.id, ['BJJ_GI'], new Map([['open-guard', 1]]));
  assert.deepEqual(
    (await athlete.getResult(user.id)).roadmaps[0].items.map((row) => row.skillKey),
    ['spider-guard'],
    'reassessment must preserve selection',
  );
  await athlete.updateRoadmapItem(user.id, childId, { selectedSkillKeys: [] });
  assert.deepEqual(
    (await athlete.getResult(user.id)).roadmaps[0].items.map((row) => row.skillKey),
    ['open-guard'],
  );
  const coverage = await editor.coverage();
  assert.equal(coverage.find((topic) => topic.id === parent.id).publishedVideoCount, 3);
  Object.assign(process.env, {
    DATABASE_URL: url,
    NODE_ENV: 'test',
    EMAIL_PROVIDER: 'console',
    SESSION_COOKIE_NAME: 'matiq_session',
    ADMIN_SESSION_COOKIE_NAME: 'matiq_admin_session',
  });
  const api = await require(resolve(root, 'apps/api/dist/bootstrap.js')).createApp();
  const adminApi = await require(resolve(root, 'apps/admin-api/dist/bootstrap.js')).createApp();
  apps.push(api.app, adminApi.app);
  for (const app of apps) await app.init();
  const request = require('supertest');
  const session = async (userId) => {
    const token = randomUUID();
    await db.session.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    return token;
  };
  await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  const token = await session(user.id);
  const target = (await athlete.getResult(user.id)).roadmaps[0].items[0].id;
  await request(api.app.getHttpServer())
    .patch(`/assessment/roadmap-items/${target}`)
    .send({ selectedSkillKeys: [] })
    .expect(401);
  await request(api.app.getHttpServer())
    .patch(`/assessment/roadmap-items/${target}`)
    .set('Cookie', `matiq_session=${token}`)
    .send({ selectedSkillKeys: 'spider-guard' })
    .expect(400);
  await request(api.app.getHttpServer())
    .patch(`/assessment/roadmap-items/${target}`)
    .set('Cookie', `matiq_session=${token}`)
    .send({ selectedSkillKeys: ['spider-guard'] })
    .expect(200);
  await request(adminApi.app.getHttpServer())
    .post('/admin/content/roadmap-topics')
    .set('Cookie', `matiq_admin_session=${token}`)
    .send({ key: 'forbidden', name: 'Forbidden' })
    .expect(401);
  const editorUser = await db.user.create({
    data: {
      email: 'editor@example.invalid',
      passwordHash: 'disabled',
      role: 'EDITOR',
      emailVerifiedAt: new Date(),
      mfaSecretEncrypted: 'synthetic-session-only',
      mfaEnabledAt: new Date(),
    },
  });
  const editorToken = await session(editorUser.id);
  const topicResponse = await request(adminApi.app.getHttpServer())
    .post('/admin/content/roadmap-topics')
    .set('Cookie', `matiq_admin_session=${editorToken}`)
    .send({ key: 'butterfly-guard', name: 'Butterfly Guard', parentId: parent.id })
    .expect(201);
  assert.equal(topicResponse.body.parentId, parent.id);
  assert.equal(
    await db.auditLog.count({
      where: {
        entityId: topicResponse.body.id,
        actor: editorUser.id,
        action: 'ROADMAP_TOPIC_CREATED',
      },
    }),
    1,
  );
  console.log(
    'PASS: migrations, admin hierarchy, cycle rejection, published/discipline filtering, parent video coverage, deduplication, selection persistence, ownership, reassessment and reset.',
  );
} finally {
  for (const app of apps) await app.close();
  await db.$disconnect();
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  await admin.$disconnect();
}
