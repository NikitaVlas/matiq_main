import { MetricsRegistry } from '@matiq/backend';
import type { PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerObservabilityServer } from '../src/observability-server.js';
import type { WorkerEvent } from '../src/types.js';

describe('WorkerObservabilityServer', () => {
  let server: WorkerObservabilityServer | undefined;

  afterEach(async () => server?.close());

  it('exposes liveness, readiness and queue metrics', async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      outboxEvent: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    const redis = { ping: vi.fn().mockResolvedValue('PONG') } as unknown as Pick<Redis, 'ping'>;
    const queue = {
      getJobCounts: vi.fn().mockResolvedValue({ waiting: 2, active: 1, delayed: 0, failed: 0 }),
    } as unknown as Pick<Queue<WorkerEvent>, 'getJobCounts'>;
    server = new WorkerObservabilityServer(db, redis, queue, new MetricsRegistry());
    const port = await server.listen(0, '127.0.0.1');

    await expect(
      fetch(`http://127.0.0.1:${port}/health`).then((value) => value.json()),
    ).resolves.toEqual({
      status: 'ok',
      service: 'worker',
    });
    expect((await fetch(`http://127.0.0.1:${port}/ready`)).status).toBe(200);
    const metrics = await fetch(`http://127.0.0.1:${port}/metrics`).then((value) => value.text());
    expect(metrics).toContain('matiq_worker_queue_jobs{state="waiting"} 2');
  });

  it('returns a safe unavailable readiness response', async () => {
    const db = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('secret')),
    } as unknown as PrismaClient;
    const redis = { ping: vi.fn().mockResolvedValue('PONG') } as unknown as Pick<Redis, 'ping'>;
    const queue = { getJobCounts: vi.fn() } as unknown as Pick<Queue<WorkerEvent>, 'getJobCounts'>;
    server = new WorkerObservabilityServer(db, redis, queue, new MetricsRegistry());
    const port = await server.listen(0, '127.0.0.1');

    const response = await fetch(`http://127.0.0.1:${port}/ready`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'unavailable', service: 'worker' });
  });
});
