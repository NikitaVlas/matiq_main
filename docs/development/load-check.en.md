# Local load check

## Running

Start local infrastructure with `docker compose up -d`, run `pnpm load:test`,
then `pnpm load:check` (`pnpm.cmd` where required on Windows).
The command builds backend, API and worker, creates a unique disposable
`matiq_load_<uuid>` database and `matiq-load-<uuid>` Redis queue, and removes only
those resources on completion. It targets fixed local Compose PostgreSQL/Redis
ports, never application data or configurable remote URLs. The API process does
not load application `.env` files; no external providers are called.

JSON evidence and API logs are written to `test-results/load/<uuid>/`. Errors,
insufficient samples, queue failure or database cleanup failure return nonzero.
An abruptly terminated process can leave its resources behind; verify the exact
run UUID before manually removing anything.

## Methodology

- 100/1000 synthetic published videos, taxonomy, 20 courses and five trainers.
- Compiled API in a separate process on a random loopback port; real PostgreSQL.
- Videos, taxonomy, courses and trainers endpoints rotate evenly at 1/5/20
  concurrent requests for eight seconds per phase, after per-route warm-up.
  Requests have 10-second timeouts; final completions count toward elapsed time.
- Per-route p50/p95/p99/max, correctness failures/statuses, response bytes and
  throughput; at least five responses per route and phase are required.
- API CPU time, RSS sampled every 100 ms, event-loop p99 at 20 ms resolution.
  PostgreSQL counters are asynchronous and include harness queries, not a profiler.
- Existing frontend filter functions run in Node: eight option lists, six filters
  plus search, 10 warm-up and 100 measured iterations, with result-count validation.
- 250 events through actual outbox/BullMQ/inbox code at concurrency 5, drained
  within 60 seconds; 250 completed-event redeliveries must not repeat effects.

## Limits

After catalog optimization, `paginatedHttp` contains an additional series:
24-video first page, global facets and a position-filtered page, at the same
dataset sizes and concurrency levels. The original four-route mix remains in
`http`. The mixes differ, so their RPS is not a direct whole-system speedup.
Page response bytes can be compared with the full-summary response.

This is a short closed-loop baseline on one development machine, not an arrival-
rate SLA, soak test, production capacity or athlete count. Latency SLOs are not
approved; measurements are observations, not launch acceptance. Small-sample p99
is not a stable tail estimate. Browser rendering/input latency, authenticated
writes and actual email/video/payment jobs remain untested by this harness.
No-op throughput does not represent provider jobs. Repeat on deployment hardware
with agreed traffic, real handlers and sustained load before launch.

Comparative evidence: [catalog verification 2026-09-26](catalog-load-2026-09-26.en.md).

## Document status

- Status: Active local runbook; production capacity not established
- Owner: MATIQ team
- Last reviewed: 2026-09-26
- Related code: scripts/load, root package scripts
