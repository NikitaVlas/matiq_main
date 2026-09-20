import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fork, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { cpus, platform, totalmem } from 'node:os';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { measureHttp } from './measure.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apiRequire = createRequire(resolve(root, 'apps/api/package.json'));
const workerRequire = createRequire(resolve(root, 'apps/worker/package.json'));

// This child imports bootstrap directly: it never loads the workspace .env.
if (process.argv.includes('--api-child')) {
  apiRequire('reflect-metadata');
  const { createApp } = apiRequire(resolve(root, 'apps/api/dist/bootstrap.js'));
  const { app } = await createApp();
  await app.listen(0, '127.0.0.1');
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  let cpu = process.cpuUsage();
  let peakRss = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }, 100);
  process.on('message', async (message) => {
    if (message === 'sample') {
      const next = process.cpuUsage();
      process.send({
        sample: {
          cpuMs: (next.user + next.system - cpu.user - cpu.system) / 1000,
          peakRssBytes: peakRss,
          eventLoopP99Ms: histogram.percentile(99) / 1e6,
        },
      });
      cpu = next;
      peakRss = process.memoryUsage().rss;
      histogram.reset();
    }
    if (message === 'stop') {
      clearInterval(timer);
      histogram.disable();
      await app.close();
      process.disconnect();
    }
  });
  process.on('disconnect', () => process.exit(0));
  process.send({ port: app.getHttpServer().address().port });
} else {
  await main();
}

function messageFrom(child, key) {
  return new Promise((resolveMessage, reject) => {
    const finish = (error, value) => {
      clearTimeout(timer);
      child.off('message', listener);
      child.off('exit', exit);
      child.off('error', fail);
      if (error) reject(error);
      else resolveMessage(value);
    };
    const listener = (message) => {
      if (key in message) finish(null, message[key]);
    };
    const exit = () => finish(new Error('API_CHILD_EXITED'));
    const fail = () => finish(new Error('API_CHILD_FAILED'));
    const timer = setTimeout(() => finish(new Error('API_CHILD_TIMEOUT')), 30_000);
    child.on('message', listener);
    child.once('exit', exit);
    child.once('error', fail);
  });
}

async function main() {
  const { measureCatalog } = await import('./catalog.mjs');
  const { PrismaClient } = apiRequire('@prisma/client');
  const runId = randomUUID().replaceAll('-', '');
  const databaseName = `matiq_load_${runId}`;
  const output = resolve(root, 'test-results/load', runId);
  mkdirSync(output, { recursive: true });
  const report = {
    runId,
    startedAt: new Date().toISOString(),
    mode: 'local-closed-loop',
    environment: {
      node: process.version,
      platform: platform(),
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      hostMemoryBytes: totalmem(),
    },
    datasetSizes: [100, 1000],
    http: [],
    filters: [],
    status: 'FAILED',
    cleanup: {},
  };
  // Fixed local Compose endpoint; no user-supplied DATABASE_URL can reach this harness.
  const base = 'postgresql://matiq:matiq_local@127.0.0.1:5432/';
  const url = `${base}${databaseName}?connection_limit=10&pool_timeout=10&connect_timeout=5`;
  const admin = new PrismaClient({
    datasources: { db: { url: `${base}matiq?connect_timeout=5` } },
  });
  const db = new PrismaClient({ datasources: { db: { url } } });
  let created = false;
  let child;
  let log;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const env = {
      ...process.env,
      DATABASE_URL: url,
      NODE_ENV: 'test',
      EMAIL_PROVIDER: 'console',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      STRIPE_PRICE_ID: '',
      REDIS_URL: 'redis://127.0.0.1:6379',
      S3_ENDPOINT: 'http://127.0.0.1:9100',
    };
    execFileSync(
      process.execPath,
      [
        apiRequire.resolve('prisma/build/index.js'),
        'migrate',
        'deploy',
        '--schema',
        resolve(root, 'apps/api/prisma/schema.prisma'),
      ],
      { env, stdio: 'pipe', timeout: 60_000 },
    );
    await seedBase(db);
    log = openSync(resolve(output, 'api.log'), 'w');
    child = fork(fileURLToPath(import.meta.url), ['--api-child'], {
      env,
      stdio: ['ignore', log, log, 'ipc'],
    });
    const port = await messageFrom(child, 'port');
    const baseUrl = `http://127.0.0.1:${port}`;
    const paths = ['/content/videos', '/content/catalog', '/content/courses', '/content/trainers'];
    let previousSize = 0;
    for (const size of report.datasetSizes) {
      await seedVideos(db, previousSize, size);
      previousSize = size;
      const validate = (path, body) =>
        Array.isArray(body) &&
        (path === '/content/videos'
          ? body.length === size &&
            body.every((v) => v.techniques.length && v.trainer && !('storageKey' in v))
          : path === '/content/courses'
            ? body.length === 20 &&
              body.reduce(
                (sum, c) => sum + c.modules.reduce((n, m) => n + m.lessons.length, 0),
                0,
              ) === size
            : path === '/content/trainers'
              ? body.length === 5
              : body.length >= 10);
      for (const path of paths) {
        const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok || !validate(path, await response.json()))
          throw new Error('WARMUP_VALIDATION_FAILED');
      }
      const catalog = await fetch(`${baseUrl}/content/videos`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!catalog.ok) throw new Error('FILTER_DATA_UNAVAILABLE');
      report.filters.push(await measureCatalog(await catalog.json()));
      for (const concurrency of [1, 5, 20]) {
        let sample = messageFrom(child, 'sample');
        child.send('sample');
        await sample;
        const before = await databaseStats(db);
        const phase = await measureHttp({
          baseUrl,
          paths,
          concurrency,
          durationMs: 8000,
          validate,
        });
        sample = messageFrom(child, 'sample');
        child.send('sample');
        phase.api = await sample;
        phase.databaseBefore = before;
        phase.databaseAfter = await databaseStats(db);
        report.http.push({ videos: size, ...phase });
        console.log(JSON.stringify({ videos: size, concurrency, routes: phase.routes }));
      }
    }
    report.queue = await checkQueue(db, runId);
    report.status =
      report.http.every((p) =>
        Object.values(p.routes).every((r) => r.failures === 0 && r.requests >= 5),
      ) && report.queue.passed
        ? 'PASSED'
        : 'FAILED';
  } catch (error) {
    // Avoid dumping connection strings or environment values into the report.
    report.error =
      error instanceof Error ? error.message.split('\n')[0].slice(0, 160) : 'LOAD_CHECK_FAILED';
  } finally {
    if (child && child.exitCode === null) {
      await new Promise((done) => {
        const timer = setTimeout(() => {
          child.kill();
        }, 5000);
        child.once('exit', () => {
          clearTimeout(timer);
          done();
        });
        if (child.connected) child.send('stop');
        else child.kill();
      });
    }
    if (log !== undefined) closeSync(log);
    await db.$disconnect();
    if (created) {
      try {
        // Only the database successfully created above can be dropped.
        await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
        report.cleanup.database = true;
      } catch {
        report.cleanup.database = false;
        report.status = 'FAILED';
      }
    }
    await admin.$disconnect();
    report.finishedAt = new Date().toISOString();
    writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`Load check ${report.status}: ${resolve(output, 'report.json')}`);
    if (report.status !== 'PASSED') process.exitCode = 1;
  }
}

async function databaseStats(db) {
  return (
    await db.$queryRaw`SELECT numbackends, xact_commit::float8, xact_rollback::float8,
    blks_read::float8, blks_hit::float8, tup_returned::float8, tup_fetched::float8,
    tup_inserted::float8, tup_updated::float8, deadlocks::float8
    FROM pg_stat_database WHERE datname = current_database()`
  )[0];
}

async function seedBase(db) {
  for (let i = 0; i < 5; i++) {
    await db.user.create({
      data: {
        id: `trainer-${i}`,
        email: `load-${i}@example.invalid`,
        passwordHash: 'disabled-load-fixture',
        role: 'TRAINER',
        trainerProfile: {
          create: {
            slug: `load-${i}`,
            displayName: `Load Trainer ${i}`,
            biography: 'Synthetic',
            athleteJourney: 'Synthetic',
            trainingPrinciples: 'Synthetic',
            city: 'Berlin',
            languages: ['de'],
            disciplines: ['BJJ_GI'],
            published: true,
          },
        },
      },
    });
  }
  for (let i = 0; i < 10; i++) {
    await db.gameArea.create({
      data: {
        id: `area-${i}`,
        key: `load-${i}`,
        name: `Area ${i}`,
        discipline: 'BJJ_GI',
        positions: {
          create: {
            id: `position-${i}`,
            key: 'load',
            name: `Position ${i}`,
            context: 'TOP',
            skillGroups: {
              create: {
                id: `group-${i}`,
                key: 'load',
                name: `Group ${i}`,
                techniques: {
                  create: { id: `technique-${i}`, key: `load-${i}`, name: `Technique ${i}` },
                },
              },
            },
          },
        },
      },
    });
  }
  for (let i = 0; i < 20; i++) {
    await db.course.create({
      data: {
        id: `course-${i}`,
        key: `load-${i}`,
        title: `Load Course ${i}`,
        discipline: 'BJJ_GI',
        published: true,
        trainerId: `trainer-${i % 5}`,
        modules: { create: { id: `module-${i}`, key: 'load', title: 'Load Module', position: 0 } },
      },
    });
  }
}

async function seedVideos(db, from, to) {
  const indexes = Array.from({ length: to - from }, (_, i) => from + i);
  await db.video.createMany({
    data: indexes.map((i) => ({
      id: `video-${i}`,
      title: `Load Video ${i}`,
      description: 'Synthetic description. '.repeat(10),
      storageKey: `load-only/${i}`,
      durationSec: 600,
      published: true,
      positionId: `position-${i % 10}`,
      techniqueId: `technique-${i % 10}`,
      trainerId: `trainer-${i % 5}`,
    })),
  });
  await db.lesson.createMany({
    data: indexes.map((i) => ({
      id: `lesson-${i}`,
      moduleId: `module-${i % 20}`,
      videoId: `video-${i}`,
      key: `load-${i}`,
      title: `Load Lesson ${i}`,
      position: i,
      published: true,
      reactions: [],
    })),
  });
}

async function checkQueue(db, runId) {
  const { Queue, Worker } = workerRequire('bullmq');
  const { Redis } = workerRequire('ioredis');
  const { IdempotentConsumer } = await import('../../apps/worker/dist/idempotent-consumer.js');
  const { OutboxDispatcher } = await import('../../apps/worker/dist/outbox-dispatcher.js');
  const connection = new Redis('redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    retryStrategy: () => null,
  });
  const queue = new Queue(`matiq-load-${runId}`, { connection });
  let effects = 0;
  let errors = 0;
  const consumer = new IdempotentConsumer(
    db,
    new Map([
      [
        'load.noop',
        async () => {
          effects++;
        },
      ],
    ]),
  );
  const worker = new Worker(queue.name, (job) => consumer.process(job), {
    connection,
    concurrency: 5,
  });
  worker.on('error', () => {
    errors++;
  });
  queue.on('error', () => {
    errors++;
  });
  connection.on('error', () => {
    errors++;
  });
  const count = 250;
  const started = performance.now();
  try {
    await worker.waitUntilReady();
    await db.outboxEvent.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        id: `event-${i}`,
        topic: 'load.noop',
        payload: { synthetic: true },
        idempotencyKey: `load-${i}`,
        availableAt: new Date(0),
      })),
    });
    const dispatcher = new OutboxDispatcher(db, queue);
    while (await dispatcher.dispatchBatch()) {
      if (performance.now() - started > 60_000) throw new Error('QUEUE_DISPATCH_TIMEOUT');
    }
    await waitFor(
      async () => (await db.inboxJob.count({ where: { status: 'COMPLETED' } })) === count,
      started + 60_000,
    );
    const drainMs = performance.now() - started;
    await queue.addBulk(
      Array.from({ length: count }, (_, i) => ({
        name: 'load.noop',
        data: { outboxEventId: `event-${i}`, topic: 'load.noop', payload: { synthetic: true } },
        opts: { jobId: `redelivery-${i}` },
      })),
    );
    await waitFor(async () => (await queue.getCompletedCount()) === count * 2);
    const deadLetters = await db.deadLetterJob.count();
    const published = await db.outboxEvent.count({ where: { status: 'PUBLISHED' } });
    return {
      jobs: count,
      redeliveries: count,
      concurrency: 5,
      drainMs,
      jobsPerSecond: count / (drainMs / 1000),
      effects,
      errors,
      deadLetters,
      published,
      passed: effects === count && errors === 0 && deadLetters === 0 && published === count,
    };
  } finally {
    await worker.close(true);
    await queue.obliterate({ force: true });
    await queue.close();
    await connection.quit();
  }
}

async function waitFor(check, deadline = performance.now() + 60_000) {
  while (!(await check())) {
    if (performance.now() > deadline) throw new Error('QUEUE_DRAIN_TIMEOUT');
    await delay(100);
  }
}
