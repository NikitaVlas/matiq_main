import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';

const connection = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
if (
  !['localhost', '127.0.0.1'].includes(connection.hostname) ||
  connection.pathname !== '/matiq_test'
)
  throw new Error('Disposable local matiq_test database required');

describe('public catalog pagination against PostgreSQL', () => {
  const db = new PrismaClient();
  const prefix = `catalog-${randomUUID()}`;
  const id = (value: string) => `${prefix}-${value}`;
  let app: INestApplication | undefined;
  let fieldId: string;
  let createdField = false;
  beforeAll(async () => {
    app = (await createApp()).app;
    await app.init();
    await db.user.create({
      data: {
        id: id('trainer'),
        email: `${prefix}@example.invalid`,
        passwordHash: 'disabled-test-account',
        role: 'TRAINER',
        trainerProfile: {
          create: {
            slug: prefix,
            displayName: `Trainer ${prefix}`,
            biography: '',
            athleteJourney: '',
            trainingPrinciples: '',
            city: '',
            published: true,
            disciplines: ['BJJ_GI'],
          },
        },
      },
    });
    await db.gameArea.create({
      data: { id: id('area'), key: prefix, name: prefix, discipline: 'BJJ_GI' },
    });
    await db.position.create({
      data: {
        id: id('position'),
        key: prefix,
        name: prefix,
        context: 'TOP',
        gameAreaId: id('area'),
      },
    });
    await db.skillGroup.create({
      data: { id: id('group'), key: prefix, name: prefix, positionId: id('position') },
    });
    await db.technique.create({
      data: { id: id('technique'), key: prefix, name: prefix, skillGroupId: id('group') },
    });
    await db.techniqueVariant.create({
      data: { id: id('variant'), discipline: 'BJJ_GI', name: prefix, techniqueId: id('technique') },
    });
    await db.movement.create({ data: { id: id('movement'), key: prefix, name: prefix } });
    await db.drill.create({
      data: {
        id: id('drill'),
        key: prefix,
        name: prefix,
        techniqueId: id('technique'),
        movementId: id('movement'),
      },
    });
    await db.video.createMany({
      data: Array.from({ length: 40 }, (_, i) => ({
        id: id(String(i).padStart(3, '0')),
        title: `${prefix} Video ${i}`,
        description: i === 39 ? '50%_ literal' : '',
        storageKey: 'private-test-key',
        published: true,
        createdAt: new Date('2026-01-01'),
        positionId: id('position'),
        techniqueId: i === 0 ? id('technique') : null,
        movementId: i === 0 ? id('movement') : null,
      })),
    });
    await db.video.create({
      data: {
        id: id('by-variant'),
        title: `${prefix} Variant`,
        storageKey: 'private-test-key',
        published: true,
        variantId: id('variant'),
        trainerId: id('trainer'),
      },
    });
    await db.video.create({
      data: {
        id: id('by-drill'),
        title: `${prefix} Drill`,
        storageKey: 'private-test-key',
        published: true,
        drillId: id('drill'),
        trainerId: id('trainer'),
      },
    });
    await db.video.create({
      data: {
        id: id('hidden'),
        title: `${prefix} Hidden`,
        storageKey: 'private-test-key',
        published: false,
        drillId: id('drill'),
      },
    });
    const existing = await db.metadataField.findUnique({ where: { key: 'discipline' } });
    await db.course.create({
      data: {
        id: id('course'),
        key: prefix,
        title: prefix,
        discipline: 'BJJ_GI',
        published: true,
        modules: {
          create: {
            key: prefix,
            title: prefix,
            position: 0,
            lessons: {
              create: {
                key: prefix,
                title: prefix,
                position: 0,
                videoId: id('by-drill'),
                published: true,
                reactions: [],
              },
            },
          },
        },
      },
    });
    createdField = !existing;
    const field =
      existing ??
      (await db.metadataField.create({ data: { key: 'discipline', name: 'Discipline' } }));
    fieldId = field.id;
    const option = await db.metadataOption.upsert({
      where: { fieldId_key: { fieldId, key: 'no-gi' } },
      update: {},
      create: { id: id('option'), fieldId, key: 'no-gi', name: 'No-Gi' },
    });
    await db.video.create({
      data: {
        id: id('by-metadata'),
        title: `${prefix} Metadata`,
        storageKey: 'private-test-key',
        published: true,
        metadataValues: { create: { optionId: option.id } },
      },
    });
  }, 30_000);
  afterAll(async () => {
    await db.course.deleteMany({ where: { id: id('course') } });
    await db.video.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.metadataOption.deleteMany({ where: { id: id('option') } });
    if (createdField && fieldId && (await db.metadataOption.count({ where: { fieldId } })) === 0)
      await db.metadataField.delete({ where: { id: fieldId } });
    await db.user.deleteMany({ where: { id: id('trainer') } });
    await db.drill.deleteMany({ where: { id: id('drill') } });
    await db.movement.deleteMany({ where: { id: id('movement') } });
    await db.gameArea.deleteMany({ where: { id: id('area') } });
    await app?.close();
    await db.$disconnect();
  });
  const get = (query: Record<string, string | number> = {}) =>
    request(app!.getHttpServer())
      .get('/content/video-page')
      .query({ q: prefix, ...query });

  it('returns bounded stable pages, whole-set totals and compatible legacy summaries', async () => {
    const first = (await get().expect(200)).body;
    const second = (await get({ page: 2 }).expect(200)).body;
    expect(first.items).toHaveLength(24);
    expect(first.total).toBe(43);
    expect(second.items).toHaveLength(19);
    expect(new Set([...first.items, ...second.items].map((v) => v.id)).size).toBe(43);
    expect((await get().expect(200)).body.items).toEqual(first.items);
    expect(JSON.stringify(first)).not.toMatch(
      /storageKey|private-test-key|passwordHash|example.invalid/,
    );
    const legacy = (await request(app!.getHttpServer()).get('/content/videos').expect(200)).body;
    expect(legacy.filter((v) => v.id.startsWith(prefix))).toHaveLength(43);
    expect((await get({ page: 999 }).expect(200)).body.items).toEqual([]);
    expect((await get({ id: id('hidden') }).expect(200)).body.items).toEqual([]);
  });
  it('filters all relation paths and combines filters beyond the first page', async () => {
    for (const [key, value] of Object.entries({
      techniques: id('technique'),
      skillGroups: id('group'),
    })) {
      expect((await get({ [key]: value }).expect(200)).body.items.map((v) => v.id).sort()).toEqual(
        [id('000'), id('by-drill'), id('by-variant')].sort(),
      );
    }
    const combined = {
      trainer: prefix,
      gameAreas: id('area'),
      positions: id('position'),
      skillGroups: id('group'),
      techniques: id('technique'),
      movements: id('movement'),
      drills: id('drill'),
    };
    expect((await get(combined).expect(200)).body.items.map((v) => v.id)).toEqual([id('by-drill')]);
    expect(
      (await get({ ...combined, disciplines: 'BJJ_GI' }).expect(200)).body.items.map((v) => v.id),
    ).toEqual([id('by-drill')]);
    expect(
      (await get({ disciplines: 'BJJ_GI' }).expect(200)).body.items.map((v) => v.id).sort(),
    ).toEqual([id('by-drill'), id('by-variant')].sort());
    await db.course.update({ where: { id: id('course') }, data: { published: false } });
    try {
      expect((await get({ ...combined, disciplines: 'BJJ_GI' }).expect(200)).body.total).toBe(0);
    } finally {
      await db.course.update({ where: { id: id('course') }, data: { published: true } });
    }
    expect(
      (await get({ disciplines: 'NO_GI_GRAPPLING' }).expect(200)).body.items.map((v) => v.id),
    ).toEqual([id('by-metadata')]);
    expect((await get({ q: '50%_' }).expect(200)).body.items.map((v) => v.id)).toEqual([id('039')]);
    expect((await get({ q: 'literal', page: 1 }).expect(200)).body.total).toBe(1);
    expect((await get({ techniques: 'unknown' }).expect(200)).body.total).toBe(0);
  });
  it('returns global distinct facets and excludes hidden trainer search/facets', async () => {
    const facets = (await request(app!.getHttpServer()).get('/content/video-facets').expect(200))
      .body;
    for (const [key, value] of Object.entries({
      trainer: prefix,
      gameAreas: id('area'),
      positions: id('position'),
      skillGroups: id('group'),
      techniques: id('technique'),
      movements: id('movement'),
      drills: id('drill'),
    }))
      expect(facets[key].filter((v) => v.id === value)).toHaveLength(1);
    await db.trainerProfile.update({
      where: { userId: id('trainer') },
      data: { published: false },
    });
    try {
      expect((await get({ trainer: prefix }).expect(200)).body.total).toBe(0);
      expect((await get({ q: `Trainer ${prefix}` }).expect(200)).body.total).toBe(0);
      const hidden = (await request(app!.getHttpServer()).get('/content/video-facets').expect(200))
        .body;
      expect(hidden.trainer.some((v) => v.id === prefix)).toBe(false);
    } finally {
      await db.trainerProfile.update({
        where: { userId: id('trainer') },
        data: { published: true },
      });
    }
  });
  it('keeps derived area and position facets without direct video position links', async () => {
    const directIds = Array.from({ length: 40 }, (_, i) => id(String(i).padStart(3, '0')));
    await db.video.updateMany({ where: { id: { in: directIds } }, data: { positionId: null } });
    try {
      const facets = (await request(app!.getHttpServer()).get('/content/video-facets').expect(200))
        .body;
      expect(facets.gameAreas.filter((value) => value.id === id('area'))).toHaveLength(1);
      expect(facets.positions.filter((value) => value.id === id('position'))).toHaveLength(1);
    } finally {
      await db.video.updateMany({
        where: { id: { in: directIds } },
        data: { positionId: id('position') },
      });
    }
  });
  it('rejects unbounded or malformed input', async () => {
    for (const query of [
      { limit: 49 },
      { limit: -1 },
      { page: 0 },
      { page: 10001 },
      { page: 'NaN' },
      { page: 1.5 },
      { q: 'x'.repeat(161) },
      { trainer: 'x'.repeat(121) },
    ])
      await get(query).expect(400);
  });
});
