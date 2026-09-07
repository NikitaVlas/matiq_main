import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  MetricsRegistry,
  PostgresDeletionSchedule,
  validateEmailEncryptionConfiguration,
  accountExportKey,
} from '@matiq/backend';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { IdempotentConsumer } from './idempotent-consumer.js';
import { OutboxDispatcher } from './outbox-dispatcher.js';
import type { HandlerRegistry, WorkerEvent } from './types.js';
import { WorkerObservabilityServer } from './observability-server.js';
import { configuredEmailProvider, createEmailHandler } from './email-provider.js';
import { createAccountDeletionHandler } from './privacy.js';
import { RetentionService } from './retention-service.js';
import { processPendingRenewalCancellations } from './renewal-cancellation.js';
import { createAccountExportHandler } from './account-export.js';

const queueName = process.env.WORKER_QUEUE_NAME ?? 'matiq';
validateEmailEncryptionConfiguration();
accountExportKey();
const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const db = new PrismaClient();
const metrics = new MetricsRegistry();
const queue = new Queue<WorkerEvent>(queueName, { connection });
const handlers: HandlerRegistry = new Map([
  ['system.noop', async () => Promise.resolve()],
  ['email.send.v1', createEmailHandler(configuredEmailProvider())],
  ['privacy.account-delete.v1', createAccountDeletionHandler(db)],
  ['privacy.account-export.v1', createAccountExportHandler(db)],
]);
const consumer = new IdempotentConsumer(db, handlers, metrics);
const dispatcher = new OutboxDispatcher(db, queue, 25, metrics);
const worker = new Worker<WorkerEvent>(queueName, (job) => consumer.process(job), { connection });
const observability = new WorkerObservabilityServer(db, connection, queue, metrics);
const pollingIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1_000);
let dispatching = false;
let applyingRetention = false;
let reconcilingRenewals = false;
// No production provider is selected. External operations fail closed until
// an approved adapter is wired; local-only subscriptions can be confirmed.
const renewalTimer = setInterval(() => {
  if (reconcilingRenewals) return;
  reconcilingRenewals = true;
  void processPendingRenewalCancellations(db)
    .then(async (counts) => ({
      ...counts,
      deletionsStarted: await new PostgresDeletionSchedule(db).processDue(),
    }))
    .then((counts) =>
      console.info(JSON.stringify({ message: 'renewal_reconciliation', ...counts })),
    )
    .catch(() => console.error(JSON.stringify({ message: 'renewal_reconciliation_failed' })))
    .finally(() => {
      reconcilingRenewals = false;
    });
}, 60_000);
const retention = new RetentionService(db);

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

const retentionIntervalMs = Number(process.env.RETENTION_INTERVAL_MS ?? 24 * 60 * 60 * 1_000);
const retentionTimer = setInterval(
  () => {
    if (applyingRetention) return;
    applyingRetention = true;
    void retention
      .runOnce()
      .then((result) => console.info(JSON.stringify({ message: 'retention_completed', ...result })))
      .catch(() => console.error(JSON.stringify({ message: 'retention_failed' })))
      .finally(() => {
        applyingRetention = false;
      });
  },
  Number.isFinite(retentionIntervalMs) && retentionIntervalMs >= 60_000
    ? retentionIntervalMs
    : 24 * 60 * 60 * 1_000,
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
  clearInterval(retentionTimer);
  clearInterval(renewalTimer);
  await observability.close();
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

void retention
  .runOnce()
  .then((result) => console.info(JSON.stringify({ message: 'retention_completed', ...result })))
  .catch(() => console.error(JSON.stringify({ message: 'retention_initial_failed' })));

void observability
  .listen(Number(process.env.WORKER_OBSERVABILITY_PORT ?? 9464))
  .catch(() => console.error(JSON.stringify({ message: 'worker_observability_start_failed' })));
