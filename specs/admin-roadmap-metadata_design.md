# Feature: Admin Roadmap topic metadata

## Requirements

- While an Admin edits video metadata, the system shall provide a DB-driven `Roadmap-Thema` field.
- When the approved Assessment topic bank contains a default topic, the Admin metadata catalogue
  shall contain the corresponding stable option key.
- When an Admin creates another Roadmap topic option, it shall immediately become selectable
  without a frontend code change.
- While reviewing content coverage, the system shall show the number of published videos assigned
  to every Roadmap topic and clearly identify uncovered topics.

## Architecture

### Frontend

- Reuse the existing metadata editor and `Add new option` flow.
- Visually explain the special `Roadmap-Thema` field and render a coverage summary.
- Preserve explicit loading and HTTP error feedback.

### Backend

- Add an application service that idempotently ensures the Roadmap metadata field and initial
  Assessment topic options.
- Add authenticated `GET /admin/content/roadmap-topic-coverage`.
- Count only published videos and return an allow-listed summary.

### Security

- Existing Admin/Editor guard remains required for reads.
- Existing Admin/Editor guard remains authoritative for metadata catalogue changes; video
  assignment keeps its existing Admin-only audited boundary.
- Stable keys and names are server-controlled seed values; custom options use existing validated
  Prisma writes.
- No storage keys, user data, or watch history are included in coverage.

## Acceptance criteria

- `Roadmap-Thema` appears in the metadata editor without manual database setup.
- The field includes all initial Assessment topic keys.
- New values can be created using the existing `Add new option` control.
- Coverage shows published video counts and labels zero-count topics as uncovered.
- Repeated catalogue requests do not create duplicate fields or options.

## Implementation plan

- [x] Add the Roadmap metadata application service.
- [x] Expose coverage through the guarded Admin API.
- [x] Add field guidance and coverage to Admin Web.
- [x] Add idempotency and coverage tests.
- [x] Run verification and browser checks.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/admin-api/src/modules/content`, `apps/admin-web/src/screens/video`
