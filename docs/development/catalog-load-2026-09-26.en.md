# Catalog optimization verification — 2026-09-26

## Result

Run `11385cf9d67641829c123087113a2793`: PASSED, 16,188 HTTP requests, no
status/content failures. Every phase met the minimum sample count. Disposable
database removed. Command: `pnpm load:check`; raw report:
`test-results/load/11385cf9d67641829c123087113a2793/report.json`.

Windows, Node 22.15.0, Core Ultra 5 235H, 14 logical CPUs, approximately 31.5 GiB
RAM; PostgreSQL 17 and Redis 7.4 in Docker, API pool of 10 connections.
See the [runbook](load-check.en.md) for methodology and limitations.

## Response size and latency

At 1000 videos, the full list is 665,781 bytes and a 24-video page is 16,028
bytes: approximately 41.5 times smaller. Facets occupy 1827 bytes versus
1,213,965 bytes for the old taxonomy response with nested content. These
responses serve different purposes; the migrated frontend requests only what
it needs.

All latency columns are locally observed p95 milliseconds.

| Videos | Concurrency | Page  | Facets | Position-filtered page |
| ------ | ----------- | ----- | ------ | ---------------------- |
| 100    | 1           | 39.1  | 48.5   | 41.3                   |
| 100    | 5           | 34.1  | 33.4   | 34.8                   |
| 100    | 20          | 103.7 | 98.6   | 104.1                  |
| 1000   | 1           | 40.6  | 64.3   | 48.6                   |
| 1000   | 5           | 35.1  | 40.9   | 37.6                   |
| 1000   | 20          | 94.2  | 99.9   | 100.3                  |

In the preserved four-route legacy mix at 1000 videos/concurrency 20, taxonomy
p95 changed from 572.7 ms in the [baseline](load-baseline-2026-09-20.en.md) to
289.4 ms. Conversely, full videos changed from 277.9 to 387.8 ms, courses from
183.9 to 286.9 ms and trainers from 122.4 to 194.9 ms. Improvement across all
routes is not established. The new request mix differs from the old one, so
cross-mix RPS is not a whole-system speedup ratio.

## Observed failure and correction

Initial run `3b5b35cd449348fabf3a3554ec4c8acc` FAILED because slow facet queries
prevented concurrency-1 phases from collecting five responses per route.
There were no HTTP failures; queue verification and database cleanup succeeded.
At 1000 videos/concurrency 20, facet p95 was 5087.8 ms and page p95 was 2469.1 ms.

EXPLAIN ANALYZE on the test database attributed approximately 945/749 ms to JIT
compilation for area/position queries. Direct and derived relation paths now
use separate SELECTs within the same RepeatableRead transaction; results are
merged by ID. Equivalent diagnostic plans executed in under 1 ms without JIT.
No global PostgreSQL settings or response caches were introduced.

## Verification and remaining limits

- `pnpm verify`: passed, including formatting, architecture, lint, types, units
  and builds.
- API integration: 17 tests across eight files, including five catalog cases
  covering derived positions without direct video links and distinct facets.
- Initial integration setup failed because the lesson fixture omitted required
  `reactions: []`; fixed without weakening assertions or application behavior.
- `pnpm load:test`: three passed with subprocess permission after the initial
  sandbox `spawn EPERM` failure.
- Queue: 250 events drained in 1.42 seconds; 250 redeliveries left exactly 250
  effects, no errors or dead letters. Handler is a no-op.
- Browser suites were not repeated in this continuation because frontend code
  did not change; earlier evidence is 27 public tests and seven final catalog tests.
- Remote CI, real providers, sustained load and production SLOs remain unverified.
  A successful local run does not establish launch readiness.

## Document status

- Status: Verified local evidence; production load gate remains open
- Owner: MATIQ team
- Last reviewed: 2026-09-26
- Related code: content API, scripts/load
