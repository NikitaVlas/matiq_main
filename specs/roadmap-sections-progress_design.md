# Feature: Roadmap recommendation sections and progress

## Requirements

- While an athlete views a Roadmap, the system shall separate development gaps, core strengths,
  and exploration goals.
- For every visible or completed Roadmap step, the system shall show completed published videos,
  total matching published videos, percentage, and progress status.
- Progress shall be calculated only from the authenticated athlete's watch history.

## Architecture

### Frontend

- Render `GAP`, `CORE`, and `EXPLORE` as distinct sections with explanatory German labels.
- Use native progress semantics and show an explicit empty-content state.

### Backend

- Decorate Roadmap result items with progress derived from published videos matching the stable
  Roadmap topic and discipline, including a directly assigned published lesson video.
- Return only aggregate progress and the existing allow-listed video summary.

### Security

- Reuse the authenticated Assessment result endpoint.
- Scope watch-event reads to the authenticated user ID and never expose raw watch events.

## Acceptance criteria

- [x] Roadmap steps are grouped by recommendation type.
- [x] Every visible step shows content-based progress or an explicit no-content state.
- [x] Completed steps retain their progress summary.
- [x] Progress reads only the current athlete's history.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/assessment`, `apps/web/src/app/roadmap`
