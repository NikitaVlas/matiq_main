# Feature: API observability foundation

## Requirements (EARS Format)

- When either HTTP API receives a request, the system shall return a safe
  correlation ID and include it in a structured completion log.
- When a caller supplies a valid correlation ID, the system shall preserve it.
- When a caller supplies an invalid correlation ID, the system shall replace it
  with a generated value.
- When `/health` is requested, the API shall report process liveness without
  depending on external infrastructure.
- When `/ready` is requested, the API shall report readiness only after a
  successful PostgreSQL query.

## Architecture

- Frontend: no UI change; responses expose `x-correlation-id` for diagnostics.
- Backend: both NestJS hosts register the same framework-free ID policy and
  host-local request middleware; health controllers own host readiness.
- Security: health responses expose only status and service name. Logs exclude
  query strings, request bodies, cookies, headers, tokens, and database errors.
  Correlation headers are length/character constrained before logging.

## Implementation Plan

- [x] Add and test framework-free correlation ID validation.
- [x] Register response headers and structured completion logs in both APIs.
- [x] Add liveness and database readiness endpoints to both APIs.
- [x] Add endpoint and middleware tests.
- [x] Run required verification.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-23
- Related code: `packages/backend`, `apps/api`, `apps/admin-api`
