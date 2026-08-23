# Feature: OpenAPI client boundary

## Requirements (EARS Format)

- While a frontend calls a MATIQ HTTP API, when it supplies a route, the system
  shall verify that the route exists in the generated OpenAPI contract.
- While a route contains OpenAPI path parameters, when the frontend supplies
  concrete parameter values, the system shall accept the resulting runtime path.
- When an API response is unsuccessful, the existing screen-specific error
  handling shall remain responsible for the user-visible state.

## Architecture

### Frontend

- `apps/web` uses a shared `userApiResponse` transport for raw responses and
  `userApi` for JSON responses.
- `apps/admin-web` keeps its shared transport and constrains route arguments to
  generated Admin API paths.
- Existing loading, error and accessibility behavior remains unchanged.

### Backend

- No endpoint or database change.
- NestJS-generated OpenAPI documents remain the source of route truth.

### Security

- Requests continue to use HTTP-only cookies with `credentials: include`.
- The client performs no authorization decisions; API guards remain authoritative.
- No response body, token or credential is logged by the transport.
- No new input surface, rate-limit requirement or audit event is introduced.

## Implementation Plan

- [x] Export runtime-path types derived from generated OpenAPI `paths`.
- [x] Constrain shared User and Admin API transports to those paths.
- [x] Remove the stale `/subscription/activate` frontend call.
- [x] Migrate remaining direct User API calls to the shared transport.
- [x] Reject direct frontend `fetch` calls in the architecture check.
- [x] Run format, lint, typecheck and available tests.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-23
- Related code: `packages/contracts`, `apps/web`, `apps/admin-web`
