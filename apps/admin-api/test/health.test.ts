import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/bootstrap';
import { HealthController } from '../src/modules/admin/admin.module';

describe('Admin API health', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('keeps liveness public and returns the correlation ID', async () => {
    app = (await createApp()).app;
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'admin-request-123')
      .expect(200, { status: 'ok', service: 'admin-api' });

    expect(response.headers['x-correlation-id']).toBe('admin-request-123');
  });

  it('reports readiness after a PostgreSQL check', async () => {
    app = (await createApp()).app;
    vi.spyOn(app.get(HealthController).database, 'ping').mockResolvedValueOnce();
    await app.init();

    await request(app.getHttpServer())
      .get('/ready')
      .expect(200, { status: 'ok', service: 'admin-api' });
  });

  it('does not expose database errors when readiness fails', async () => {
    app = (await createApp()).app;
    vi.spyOn(app.get(HealthController).database, 'ping').mockRejectedValueOnce(
      new Error('sensitive database detail'),
    );
    await app.init();

    await request(app.getHttpServer()).get('/ready').expect(503, {
      status: 'unavailable',
      service: 'admin-api',
    });
  });
});
