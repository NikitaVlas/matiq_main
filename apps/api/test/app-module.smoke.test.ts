import type { INestApplication } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap';
import { AuthService } from '../src/modules/identity';
import { AssessmentService } from '../src/modules/assessment';
import { ContentService } from '../src/modules/content';
import { SubscriptionService } from '../src/modules/subscription';

describe('AppModule composition', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('resolves feature services through the composed module graph', async () => {
    const created = await createApp();
    app = created.app;
    await app.init();

    expect(app.get(AuthService)).toBeDefined();
    expect(app.get(AssessmentService)).toBeDefined();
    expect(app.get(ContentService)).toBeDefined();
    expect(app.get(SubscriptionService)).toBeDefined();
  });
});
