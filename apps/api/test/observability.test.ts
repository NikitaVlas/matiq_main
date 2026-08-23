import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/bootstrap';
import { HealthController } from '../src/shared/infrastructure/health.controller';

describe('User API observability', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('exposes liveness and preserves a safe correlation ID', async () => {
    app = (await createApp()).app;
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'test-request-123')
      .expect(200, { status: 'ok', service: 'user-api' });

    expect(response.headers['x-correlation-id']).toBe('test-request-123');
  });

  it('checks PostgreSQL readiness and replaces an unsafe correlation ID', async () => {
    app = (await createApp()).app;
    vi.spyOn(app.get(HealthController).database, 'ping').mockResolvedValueOnce();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/ready')
      .set('x-correlation-id', 'unsafe value')
      .expect(200, { status: 'ok', service: 'user-api' });

    expect(response.headers['x-correlation-id']).toMatch(/^[A-Za-z0-9._:-]+$/);
    expect(response.headers['x-correlation-id']).not.toBe('unsafe value');
  });

  it('reports a safe unavailable response when PostgreSQL is not ready', async () => {
    app = (await createApp()).app;
    vi.spyOn(app.get(HealthController).database, 'ping').mockRejectedValueOnce(
      new Error('sensitive database detail'),
    );
    await app.init();

    await request(app.getHttpServer()).get('/ready').expect(503, {
      status: 'unavailable',
      service: 'user-api',
    });
  });
});
