# Feature: Assessment-driven Roadmap content discovery

## Requirements

- While an athlete completes an Assessment, the system shall generate Roadmap steps that reference
  shared methodology keys instead of disconnected display text.
- While a Roadmap step is visible, when the athlete opens it, the system shall show matching
  published lessons, courses, and viewing progress.
- While Assessment results are displayed, each recommendation shall link to its Roadmap step.
- When administrators add methodology metadata and assign it to videos, matching Roadmap details
  shall expand without a frontend code change.
- Watching content shall update learning progress but shall not claim technique mastery.

## Architecture

### Frontend

- Make Assessment result cards and Roadmap titles semantic links.
- Add `/roadmap/[id]` with explicit loading, not-found, empty-content, and progress states.
- Show matching courses and lessons separately, with watched percentage and completion status.

### Backend

- Add authenticated `GET /assessment/roadmap-items/:id`.
- Scope the lookup to the authenticated athlete profile.
- Match published videos by the Roadmap `skillKey` against Position, Technique, or DB-driven
  metadata options, restricted to the Roadmap discipline.
- Return an allow-listed response and aggregate unique published courses from matching lessons.
- Extend the approved seed question bank with Mount, Closed Guard, Open Guard, and Side Control
  contexts; the existing Admin API remains the extension point for further questions.

### Security

- Existing session authentication remains mandatory.
- The item query includes athlete ownership to prevent IDOR.
- Only published videos, lessons, and courses are returned.
- Storage keys, other users' identity, and unrelated watch history are excluded.
- Prisma parameterisation is used for every lookup; no client-provided query fragments are accepted.

## Acceptance criteria

- Assessment recommendations link to `/roadmap/:id`.
- Roadmap titles link to the same detail page without interfering with reorder/hide actions.
- A detail page lists all matching published lessons and their courses.
- Lesson progress reflects the authenticated user's VideoWatch record.
- An unknown or foreign Roadmap ID returns 404.
- A topic with no matching content shows a useful empty state.

## Implementation plan

- [x] Extend the question bank and labels.
- [x] Implement the ownership-scoped detail endpoint.
- [x] Add clickable Assessment and Roadmap results.
- [x] Add the Roadmap detail page and progress UI.
- [x] Add regression tests and run verification.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/assessment`, `apps/web/src/app/roadmap`
