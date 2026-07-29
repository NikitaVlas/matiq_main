# Feature: Recommendation priority and Roadmap diagnostics

## Requirements

- After a video, the primary recommendation shall come from the active Roadmap when available,
  followed by the lesson path and then related metadata content.
- Roadmap matching shall support the DB-driven `Roadmap-Thema` video metadata field.
- Admin diagnostics shall identify Roadmap topics without published content, topics used only by
  drafts, topics unused by Assessment, and published videos without a Roadmap topic.

## Architecture

### Frontend

- Show diagnostics beside Roadmap content coverage with direct topic and video names.

### Backend

- Preserve the existing `ROADMAP`, `LESSON_PATH`, `METADATA` recommendation contract and priority.
- Add metadata-topic matching to Roadmap recommendation lookup.
- Add a guarded, allow-listed Admin diagnostics endpoint.

### Security

- User recommendations remain subscription-protected and user-scoped.
- Diagnostics reuse the existing Admin/Editor guard and expose no user or watch-history data.

## Acceptance criteria

- [x] Roadmap metadata videos can become the primary next recommendation.
- [x] Course path remains the fallback when Roadmap has no candidate.
- [x] Admin receives actionable content-connection warnings.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/content`, `apps/admin-api/src/modules/content`, `apps/admin-web/src/screens/video`
