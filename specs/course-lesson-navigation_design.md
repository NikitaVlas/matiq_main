# Feature: Course lesson context and navigation

## Requirements

- While an entitled user watches a published lesson, the system shall show its published course,
  module, ordered lesson list, and author-defined continuations.
- When a lesson relation is conditional, the system shall show its trigger next to the target
  lesson.
- While a video is standalone or belongs to an unpublished course, the system shall omit course
  context without blocking playback.

## Architecture

### Frontend

- Extend the lesson page with course breadcrumbs, an ordered lesson navigator, current progress,
  and separate primary and conditional continuations.
- Keep loading, locked, error, standalone, and empty-relation states explicit.
- Use semantic links and lists for keyboard navigation.

### Backend

- Add an optional `courseContext` object to the existing protected playback response.
- Query only published courses and lessons and return an explicit allow-list of display fields.
- Reuse the existing playback route and entitlement enforcement; no new database model or
  migration is required.

### Security

- `ContentSessionGuard` and server-side entitlement checks remain mandatory.
- Admin and Editor review access keeps the existing verified-role exception.
- Draft courses, draft lessons, storage keys, relations to drafts, and unrelated user data are not
  included in `courseContext`.
- The route accepts only the existing video identifier and uses Prisma parameterisation.
- This read-only addition creates no CSRF-sensitive mutation and no new secret or external service.

## Acceptance criteria

- Course and module names are visible for a lesson in a published course.
- The current lesson is identified in the ordered course list.
- Primary continuation and conditional branches are visually distinct.
- A branch displays its configured trigger.
- Standalone playback continues to work with `courseContext: null`.
- Unentitled athletes remain blocked before content lookup.

## Implementation plan

- [x] Confirm existing playback and recommendation boundaries.
- [x] Add allow-listed course context to playback.
- [x] Add service regression tests for published and standalone content.
- [x] Render course context and branch navigation in Web.
- [x] Add frontend state tests.
- [x] Run format, lint, typecheck, tests, build, diff, and browser checks.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/content`, `apps/web/src/features/video`
