# Feature: Privacy operations monitoring

## Requirements

- While an MFA-enabled Admin is authenticated, when the operations view loads,
  the system shall return aggregate GDPR workflow health without subject,
  provider, payload, email or error details.
- When an Admin with authentication newer than 15 minutes confirms `RETRY`, the
  system shall make stalled pending privacy outbox work immediately available and
  enqueue a new idempotent delivery for retryable privacy dead letters.
- While the worker metrics endpoint is queried, the system shall expose the same
  aggregate queue and deletion gauges without identifiers.
- The system shall never treat a retry request as processor confirmation.

## Architecture

### Frontend

- Extend the existing German Admin dashboard with aggregate status cards,
  explicit loading/error/success states and a `RETRY` confirmation field.
- Refresh from server results after a retry; do not optimistically decrement counts.

### Backend

- Put PostgreSQL monitoring and retry logic in `packages/backend` so Admin API
  and worker share one definition of stale and review-required states.
- Add Admin-only GET and POST endpoints. POST returns only aggregate counts.
- Keep dead-letter evidence; create a new outbox event with a stable retry key.
- Extend worker Prometheus output with aggregate privacy workflow gauges.

### Security

- Admin guard requires verified account, MFA and `ADMIN` role.
- Retry additionally requires recent reauthentication and exact server-side
  confirmation. No identifier is accepted from the browser.
- SQL is parameterized; responses are allowlisted numeric fields. Payload and
  stored error text are never returned or logged. Retry creates an audit event.

## Verification

- Unit tests cover safe aggregation, authorization metadata, confirmation,
  reauthentication, idempotent retries and worker metrics.
- Regenerate OpenAPI/contracts and run Admin integration, full verification and
  browser tests where applicable.

## Document status

- Status: Verified locally; production alert routing pending
- Owner: MATIQ team
- Last reviewed: 2026-09-06
- Related code: packages/backend, apps/admin-api, apps/admin-web, apps/worker
