import { performance } from 'node:perf_hooks';

export function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export async function measureHttp({
  baseUrl,
  paths,
  concurrency,
  durationMs,
  validate,
  fetcher = fetch,
  now = () => performance.now(),
}) {
  const results = Object.fromEntries(
    paths.map((path) => [path, { latencies: [], failures: 0, bytes: 0, statuses: {} }]),
  );
  let cursor = 0;
  const started = now();
  const deadline = started + durationMs;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (now() < deadline) {
        const path = paths[cursor++ % paths.length];
        const result = results[path];
        const start = now();
        try {
          const response = await fetcher(`${baseUrl}${path}`, {
            signal: AbortSignal.timeout(10_000),
            redirect: 'error',
          });
          result.statuses[response.status] = (result.statuses[response.status] ?? 0) + 1;
          const body = await response.text();
          result.bytes += Buffer.byteLength(body);
          if (response.status !== 200 || !validate(path, JSON.parse(body))) result.failures++;
        } catch {
          result.failures++;
        }
        result.latencies.push(now() - start);
      }
    }),
  );
  const elapsedMs = now() - started;
  return {
    concurrency,
    scheduledDurationMs: durationMs,
    elapsedMs,
    routes: Object.fromEntries(
      Object.entries(results).map(([path, value]) => [
        path,
        {
          requests: value.latencies.length,
          failures: value.failures,
          statuses: value.statuses,
          requestsPerSecond: value.latencies.length / (elapsedMs / 1000),
          meanResponseBytes: value.latencies.length ? value.bytes / value.latencies.length : 0,
          p50Ms: percentile(value.latencies, 0.5),
          p95Ms: percentile(value.latencies, 0.95),
          p99Ms: percentile(value.latencies, 0.99),
          maxMs: percentile(value.latencies, 1),
        },
      ]),
    ),
  };
}
