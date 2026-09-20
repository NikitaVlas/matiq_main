import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import { percentile } from './measure.mjs';

// Execute the existing pure filter functions, without copying their implementation.
// This measures computation in Node, not browser rendering or input latency.
export async function measureCatalog(videos) {
  const source = readFileSync(
    new URL('../../apps/web/src/features/catalog/catalog.ts', import.meta.url),
    'utf8',
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const { filterVideos, filterOptions, filterLabels } = await import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
  );
  const samples = [];
  const filters = {
    disciplines: 'BJJ_GI',
    trainer: 'load-0',
    gameAreas: 'area-0',
    positions: 'position-0',
    skillGroups: 'group-0',
    techniques: 'technique-0',
  };
  for (let iteration = 0; iteration < 110; iteration++) {
    const start = performance.now();
    for (const key of Object.keys(filterLabels)) filterOptions(videos, key);
    const result = filterVideos(videos, filters, 'Load Video');
    if (result.length !== videos.length / 10) throw new Error('FILTER_VALIDATION_FAILED');
    if (iteration >= 10) samples.push(performance.now() - start);
  }
  return {
    videos: videos.length,
    samples: samples.length,
    warmupIterations: 10,
    workload: 'eight option lists + six combined filters + text search; Node only',
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    maxMs: percentile(samples, 1),
  };
}
