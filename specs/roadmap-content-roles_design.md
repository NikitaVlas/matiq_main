# Feature: Roadmap content roles and automatic completion

## Requirements

- Admin can classify Roadmap videos as `Required`, `Recommended`, or `Optional`.
- A Roadmap step completes automatically only after every published `Required` video for its topic
  has been completed by the athlete.
- Recommended and optional videos never block completion.

## Architecture

- Reuse the DB-driven metadata catalogue with the stable field `roadmap-content-role`.
- Seed the three system roles idempotently and expose them through the existing guarded metadata API.
- Re-evaluate affected active Roadmap steps after a video becomes completed.

## Security

- Metadata changes remain Admin-only and audited through the existing video metadata endpoint.
- Completion queries are scoped to the authenticated user and expose no additional watch history.

## Acceptance criteria

- [x] Admin can assign one of the three roles while editing video metadata.
- [x] Every required video must be completed before automatic step completion.
- [x] Recommended and optional videos do not block completion.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/admin-api/src/modules/content`, `apps/api/src/modules/content`, `apps/admin-web/src/screens/video`
