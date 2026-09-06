import type { PrismaClient } from '@prisma/client';
import { PostgresPrivacyOperationsMonitor, type MetricsRegistry } from '@matiq/backend';
import type { Queue } from 'bullmq';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Redis } from 'ioredis';
import type { WorkerEvent } from './types.js';

export class WorkerObservabilityServer {
  private server: Server | undefined;

  constructor(
    private readonly db: PrismaClient,
    private readonly redis: Pick<Redis, 'ping'>,
    private readonly queue: Pick<Queue<WorkerEvent>, 'getJobCounts'>,
    private readonly metrics: MetricsRegistry,
  ) {}

  async listen(port: number, host = '0.0.0.0') {
    this.server = createServer(async (request, response) => {
      if (request.method !== 'GET') return sendJson(response, 404, { status: 'not_found' });
      if (request.url === '/health')
        return sendJson(response, 200, { status: 'ok', service: 'worker' });
      if (request.url === '/ready') return this.readiness(response);
      if (request.url === '/metrics') return this.metricResponse(response);
      return sendJson(response, 404, { status: 'not_found' });
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(port, host, resolve);
    });
    return (this.server.address() as AddressInfo).port;
  }

  async close() {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) =>
      this.server?.close((error) => (error ? reject(error) : resolve())),
    );
  }

  private async readiness(response: Parameters<typeof sendJson>[0]) {
    try {
      await Promise.all([this.db.$queryRaw`SELECT 1`, this.redis.ping()]);
      return sendJson(response, 200, { status: 'ok', service: 'worker' });
    } catch {
      return sendJson(response, 503, { status: 'unavailable', service: 'worker' });
    }
  }

  private async metricResponse(response: Parameters<typeof sendJson>[0]) {
    try {
      const [counts, privacy] = await Promise.all([
        this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
        new PostgresPrivacyOperationsMonitor(this.db).snapshot(),
      ]);
      for (const [state, count] of Object.entries(counts)) {
        this.metrics.setGauge('matiq_worker_queue_jobs', count, { state });
      }
      this.metrics.setGauge(
        'matiq_worker_outbox_oldest_pending_seconds',
        privacy.oldestPendingSeconds,
      );
      for (const [state, count] of Object.entries(privacy)) {
        if (state === 'oldestPendingSeconds') continue;
        this.metrics.setGauge('matiq_worker_privacy_operations', count, { state });
      }
      response.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
      response.end(this.metrics.render());
    } catch {
      sendJson(response, 503, { status: 'unavailable', service: 'worker' });
    }
  }
}

type HttpResponse = {
  writeHead(status: number, headers: Record<string, string>): void;
  end(body: string): void;
};

function sendJson(response: HttpResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
