import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/bootstrap';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

describe('Admin API authentication', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = 'integration-admin-secret';
    const created = await createApp();
    app = created.app;

    vi.spyOn(app.get(DashboardController), 'stats').mockResolvedValue({
      users: 0,
      trainers: 0,
      videos: 0,
      activeAssessmentQuestions: 0,
    });

    await app.init();
  });

  afterAll(async () => {
    delete process.env.ADMIN_API_KEY;
    await app.close();
  });

  it('keeps the health endpoint public', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok', service: 'admin-api' });
  });

  it('rejects a request without the admin key', async () => {
    const response = await request(app.getHttpServer()).get('/admin/stats').expect(401);

    expect(response.body.message).toBe('Unauthorized');
  });

  it('rejects a request with an invalid admin key', async () => {
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('x-admin-key', 'wrong-secret')
      .expect(401);
  });

  it('allows a request with the configured admin key', async () => {
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('x-admin-key', 'integration-admin-secret')
      .expect(200, { users: 0, trainers: 0, videos: 0, activeAssessmentQuestions: 0 });
  });
});
