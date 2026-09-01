type Labels = Record<string, string | number>;

const buckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<
    string,
    { bucketCounts: number[]; count: number; sum: number }
  >();

  increment(name: string, labels: Labels = {}, value = 1) {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  setGauge(name: string, value: number, labels: Labels = {}) {
    this.gauges.set(metricKey(name, labels), value);
  }

  observe(name: string, value: number, labels: Labels = {}) {
    const key = metricKey(name, labels);
    const histogram = this.histograms.get(key) ?? {
      bucketCounts: buckets.map(() => 0),
      count: 0,
      sum: 0,
    };
    buckets.forEach((bucket, index) => {
      if (value <= bucket) histogram.bucketCounts[index] = (histogram.bucketCounts[index] ?? 0) + 1;
    });
    histogram.count += 1;
    histogram.sum += value;
    this.histograms.set(key, histogram);
  }

  render() {
    const lines: string[] = [];
    for (const [key, value] of [...this.counters].sort()) lines.push(`${key} ${value}`);
    for (const [key, value] of [...this.gauges].sort()) lines.push(`${key} ${value}`);
    for (const [key, histogram] of [...this.histograms].sort()) {
      const parsed = parseMetricKey(key);
      buckets.forEach((bucket, index) => {
        lines.push(
          `${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: bucket })} ${histogram.bucketCounts[index] ?? 0}`,
        );
      });
      lines.push(
        `${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: '+Inf' })} ${histogram.count}`,
      );
      lines.push(`${parsed.name}_count${formatLabels(parsed.labels)} ${histogram.count}`);
      lines.push(`${parsed.name}_sum${formatLabels(parsed.labels)} ${histogram.sum}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

export type HttpRequestLike = {
  header(name: string): string | undefined;
  method: string;
  route?: { path?: string };
  baseUrl?: string;
};

export type HttpResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
};

export function httpMetricsMiddleware(
  service: string,
  registry: MetricsRegistry,
  correlationIdFactory: (value: string | undefined) => string,
) {
  return (request: HttpRequestLike, response: HttpResponseLike, next: () => void) => {
    const correlationId = correlationIdFactory(request.header('x-correlation-id'));
    const startedAt = performance.now();
    response.setHeader('x-correlation-id', correlationId);
    response.on('finish', () => {
      const route = request.route?.path
        ? `${request.baseUrl ?? ''}${request.route.path}`
        : 'unmatched';
      const labels = {
        service,
        method: request.method,
        route,
        status_class: `${Math.floor(response.statusCode / 100)}xx`,
      };
      registry.increment('matiq_http_requests_total', labels);
      registry.observe(
        'matiq_http_request_duration_seconds',
        (performance.now() - startedAt) / 1_000,
        labels,
      );
      if (process.env.NODE_ENV !== 'test') {
        console.info(
          JSON.stringify({
            message: 'http_request_completed',
            service,
            correlationId,
            method: request.method,
            route,
            statusCode: response.statusCode,
            durationMs: Math.round(performance.now() - startedAt),
          }),
        );
      }
    });
    next();
  };
}

function metricKey(name: string, labels: Labels) {
  return `${name}${formatLabels(labels)}`;
}

function formatLabels(labels: Labels) {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return '';
  return `{${entries.map(([key, value]) => `${key}="${escapeLabel(String(value))}"`).join(',')}}`;
}

function escapeLabel(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('"', '\\"');
}

function parseMetricKey(key: string) {
  const index = key.indexOf('{');
  if (index < 0) return { name: key, labels: {} as Labels };
  const name = key.slice(0, index);
  const labels: Labels = {};
  for (const match of key.slice(index).matchAll(/([a-zA-Z_]+)="((?:\\.|[^"])*)"/g)) {
    const label = match[1];
    const value = match[2];
    if (!label || value === undefined) continue;
    labels[label] = value.replaceAll('\\"', '"').replaceAll('\\n', '\n').replaceAll('\\\\', '\\');
  }
  return { name, labels };
}
