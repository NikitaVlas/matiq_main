# Local load baseline

## Scope and plan

Authorized by the user's request to proceed with load checks. Build a repeatable,
bounded local-only benchmark with existing dependencies. Use a new disposable
PostgreSQL database per run, actual compiled User API in a separate process,
and a uniquely named Redis queue with the existing outbox dispatcher/consumer.
Never target a supplied remote URL or reuse application data. No provider calls,
authentication changes, schema changes or public contract changes.

1. Measure public videos, taxonomy, courses and trainers with 100 and 1000
   synthetic videos at 1, 5 and 20 concurrent requests.
2. Record per-route latency percentiles, status/validation failures, throughput,
   response sizes, API memory/CPU/event-loop delay and PostgreSQL counters.
3. Exercise 250 outbox events and completed-event redelivery using a no-op handler.
   Measure the existing pure catalog filter functions separately in Node (eight
   option lists, six combined filters and search; 10 warm-up/100 measured iterations).
4. Save JSON evidence, verify the harness, document findings and remaining work.

## Acceptance and interpretation

Real HTTP and PostgreSQL, bounded request timeouts, explicit warm-up, at least
five samples per route/phase, zero request/validation failures. Queue must drain
within 60 seconds with all events completed exactly once, then redelivery must
not repeat effects. Cleanup applies only to resources created by this run.
Failures must produce a nonzero exit status and retained diagnostic evidence.

Performance values are observations, not approved launch SLOs. Closed-loop
requests measure concurrency, not an arrival-rate SLA or concurrent athletes.
Frontend filter rendering, real video/email/payment work, sustained soak and
deployment-sized capacity remain outside this local baseline.

## Discovery

Graph controller data is stale (videos route missing; catalog trace has no
callees). Source files were verified directly. Existing catalog seed calls are
measured unchanged; their lifecycle cannot be silently changed for a benchmark.

## Verification

- `pnpm load:test`: 3 passed (bounded concurrency/route rotation, percentiles,
  and HTTP/JSON/semantic/timeout failures); deterministic clock in unit tests.
- `pnpm load:check`: passed, run `c5034637e6a54c4e94001b130e1d5993`.
  5807 requests with zero failures; all 250 jobs completed, 250 redeliveries
  did not repeat effects. Temporary database cleanup passed.
- `pnpm exec eslint scripts/load/*.mjs`: passed.
- `pnpm verify`: passed (format, architecture, lint, types, units and builds).
- No runtime behavior, schema, UI, contracts or dependencies changed. Browser
  and unrelated identity/payment integrations were not rerun for this tooling task.
- Findings and initial harness failures are recorded in
  `docs/development/load-baseline-2026-09-20.ru.md` and the matching English report.
- Production throughput, long-running stability and browser responsiveness remain
  unverified. Baseline reports do not close the launch load gate.

## Document status

- Status: Implemented and locally verified
- Owner: MATIQ team
- Last reviewed: 2026-09-20
- Related code: scripts/load, User API content, Worker dispatcher/consumer
