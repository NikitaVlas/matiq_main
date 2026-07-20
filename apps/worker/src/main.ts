import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'matiq',
  async (job) => {
    console.info(JSON.stringify({ message: 'job_processed', jobId: job.id, name: job.name }));
  },
  { connection },
);

worker.on('failed', (job, error) => {
  console.error(JSON.stringify({ message: 'job_failed', jobId: job?.id, error: error.message }));
});

async function shutdown() {
  await worker.close();
  await connection.quit();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
