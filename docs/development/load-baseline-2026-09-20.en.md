# Local load results — 2026-09-20

## Result

Run `c5034637e6a54c4e94001b130e1d5993`: PASSED, 5807 HTTP requests, zero
status/content failures and observed deadlocks. Disposable database removed.
JSON/API logs: `test-results/load/<run-id>/`. Command: `pnpm load:check`.
See the [runbook](load-check.en.md) for methodology and limitations.

Windows, Node 22.15.0, Core Ultra 5 235H, 14 logical CPUs, approximately 31.5 GiB
RAM; API and generator in separate processes on one host, PostgreSQL 17 and
Redis 7.4 in local Docker. API Prisma pool: 10 connections.

## HTTP measurements

Latency columns are p95 milliseconds; RPS is the combined equally rotated mix.

| Videos | Concurrency | Requests | RPS   | Videos p95 | Taxonomy p95 | Courses p95 | Trainers p95 |
| ------ | ----------- | -------- | ----- | ---------- | ------------ | ----------- | ------------ |
| 100    | 1           | 206      | 25.6  | 52.6       | 93.1         | 37.1        | 12.7         |
| 100    | 5           | 1599     | 198.9 | 32.1       | 61.2         | 20.5        | 9.4          |
| 100    | 20          | 2831     | 351.4 | 62.3       | 171.8        | 45.3        | 29.9         |
| 1000   | 1           | 85       | 10.6  | 226.6      | 135.8        | 97.9        | 11.0         |
| 1000   | 5           | 406      | 49.9  | 182.9      | 170.8        | 111.1       | 56.5         |
| 1000   | 20          | 680      | 82.1  | 277.9      | 572.7        | 183.9       | 122.4        |

At 1000 videos, decoded responses are approximately 666 KB for videos, 1.214 MB
for taxonomy and 883 KB for courses. Maximum-phase API RSS peaked at 350.6 MiB;
event-loop p99 was 76 ms. A short-run RSS rise does not prove a memory leak.

## Filters and queue

Filter computation (eight option lists plus six combined filters/search) p95:
0.21 ms at 100 videos, 2.32 ms at 1000, 100 Node iterations each. React rendering
and browser input latency are not measured.

250 no-op outbox events completed in 1.46 seconds (171/s, consumer concurrency 5).
250 redeliveries left the effect count at exactly 250; no errors or dead letters.
This is not provider-job throughput.

## Follow-up

- Whole-catalog responses grow substantially with content. Agree pagination and
  separate filter facets before library growth; API changes require approval.
- `ContentService.catalog()` performs six seed-upserts on every request. Consider
  explicit initialization while preserving empty-database behavior. Runtime was
  left unchanged in this measurement task.
- Agree traffic/latency targets, repeat on deployment hardware, run sustained
  load with real handlers and measure the populated browser interface.

Earlier successful run `eb12a846d203455e916751bd7a666192`: videos/taxonomy p95
251/504 ms at 1000 videos and concurrency 20, queue drain 2.81 s. Short local
measurements vary with host state. Initial run `32e52511f40c4348ae26c557f32b7145`
stopped before HTTP because of the Prisma CLI path; fixed and its database
removed. A harness test using a short real timer was corrected to use a
deterministic clock after Node startup timing exposed the test's instability.

## Document status

- Status: Local evidence; production load gate remains open
- Owner: MATIQ team
- Last reviewed: 2026-09-20
- Related code: scripts/load
