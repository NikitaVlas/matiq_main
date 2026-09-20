import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureHttp, percentile } from './measure.mjs';

test('parallel clients remain bounded and distribute requests across routes', async () => {
  let clock = 0;
  let active = 0;
  let peak = 0;
  const result = await measureHttp({
    baseUrl: 'http://127.0.0.1',
    paths: ['/a', '/b'],
    concurrency: 3,
    durationMs: 30,
    now: () => clock,
    validate: () => true,
    fetcher: async (_url, options) => {
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal instanceof AbortSignal);
      peak = Math.max(peak, ++active);
      await Promise.resolve();
      active--;
      clock++;
      return new Response('{}');
    },
  });
  assert.equal(peak, 3);
  assert.equal(active, 0);
  assert.ok(Math.abs(result.routes['/a'].requests - result.routes['/b'].requests) <= 1);
  assert.equal(result.routes['/a'].failures + result.routes['/b'].failures, 0);
});

test('nearest-rank percentiles handle empty and unordered samples without mutation', () => {
  const samples = [100, 1, 5, 3];
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile(samples, 0.5), 3);
  assert.equal(percentile(samples, 0.95), 100);
  assert.deepEqual(samples, [100, 1, 5, 3]);
});

test('HTTP errors, malformed JSON, semantic errors and timeouts count as failures', async () => {
  let index = 0;
  const result = await measureHttp({
    baseUrl: 'http://127.0.0.1',
    paths: ['/test'],
    concurrency: 1,
    durationMs: 5,
    now: () => index,
    validate: (_, body) => body.ok === true,
    fetcher: async () => {
      switch (index++ % 5) {
        case 0:
          return new Response('{"ok":true}');
        case 1:
          return new Response('{}', { status: 500 });
        case 2:
          return new Response('invalid');
        case 3:
          return new Response('{"ok":false}');
        default:
          throw new Error('timeout');
      }
    },
  });
  const route = result.routes['/test'];
  assert.equal(index, 5);
  assert.equal(route.requests, index);
  assert.equal(route.failures, index - Math.ceil(index / 5));
  assert.ok(route.failures > 0);
  assert.ok(route.p95Ms > 0);
});
