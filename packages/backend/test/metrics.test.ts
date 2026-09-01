import { describe, expect, it } from 'vitest';
import { MetricsRegistry, httpMetricsMiddleware } from '../src/observability/metrics';

describe('MetricsRegistry', () => {
  it('renders counters, gauges and histogram buckets', () => {
    const metrics = new MetricsRegistry();
    metrics.increment('requests_total', { result: 'ok' });
    metrics.setGauge('queue_jobs', 3, { state: 'waiting' });
    metrics.observe('request_seconds', 0.04, { route: '/health' });

    const output = metrics.render();
    expect(output).toContain('requests_total{result="ok"} 1');
    expect(output).toContain('queue_jobs{state="waiting"} 3');
    expect(output).toContain('request_seconds_count{route="/health"} 1');
  });

  it('uses a route template instead of a raw URL', () => {
    const metrics = new MetricsRegistry();
    let finish: () => void = () => undefined;
    const middleware = httpMetricsMiddleware('api', metrics, () => 'correlation');
    middleware(
      { header: () => undefined, method: 'GET', baseUrl: '/content', route: { path: '/:id' } },
      {
        statusCode: 200,
        setHeader: () => undefined,
        on: (_event, listener) => {
          finish = listener;
        },
      },
      () => undefined,
    );
    finish();
    expect(metrics.render()).toContain('route="/content/:id"');
  });
});
