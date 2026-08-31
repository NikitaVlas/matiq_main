import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { IdempotentConsumer } from './idempotent-consumer.js';
import { OutboxDispatcher } from './outbox-dispatcher.js';
import type { HandlerRegistry, WorkerEvent } from './types.js';

const queueName = process.env.WORKER_QUEUE_NAME ?? 'matiq';
const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const db = new PrismaClient();
const queue = new Queue<WorkerEvent>(queueName, { connection });
const handlers: HandlerRegistry = new Map([['system.noop', async () => Promise.resolve()]]);
const consumer = new IdempotentConsumer(db, handlers);
const dispatcher = new OutboxDispatcher(db, queue);
const worker = new Worker<WorkerEvent>(queueName, (job) => consumer.process(job), { connection });
const pollingIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1_000);
let dispatching = false;

const timer = setInterval(
  () => {
    if (dispatching) return;
    dispatching = true;
    void dispatcher
      .dispatchBatch()
      .catch(() => console.error(JSON.stringify({ message: 'outbox_dispatch_failed' })))
      .finally(() => {
        dispatching = false;
      });
  },
  Number.isFinite(pollingIntervalMs) && pollingIntervalMs >= 100 ? pollingIntervalMs : 1_000,
);

worker.on('failed', (job) => {
  console.error(
    JSON.stringify({
      message: 'job_failed',
      jobId: job?.id,
      topic: job?.data.topic,
      attemptsMade: job?.attemptsMade,
    }),
  );
});

async function shutdown() {
  clearInterval(timer);
  await worker.close();
  await queue.close();
  await connection.quit();
  await db.$disconnect();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

void dispatcher
  .dispatchBatch()
  .catch(() => console.error(JSON.stringify({ message: 'outbox_initial_dispatch_failed' })));
