# Feature: Lesson completion synchronization

## Requirements

- A published video is completed when an entitled athlete reaches at least 80 percent.
- Completion is idempotent and completes matching unfinished Roadmap items only once.
- The lesson page immediately shows completion and refreshes the next Roadmap recommendation.
- Course lesson progress updates without a manual page reload.

## Architecture

### Backend

- Keep the existing authenticated `POST /content/videos/:id/watch` endpoint.
- Reject non-finite progress, clamp progress to the video duration, and preserve the greatest saved
  position.
- Extend the existing watch record response with `newlyCompleted` and `roadmapItemsCompleted`.
- Update Roadmap items only on the incomplete-to-complete transition.

### Frontend

- Parse the completion result from every progress checkpoint.
- Update the current course lesson immutably and show an explicit completion state.
- Reload recommendations only when the server reports a new completion, making the next unfinished
  Roadmap lesson the primary next action when available.
- Keep progress-save failures contextual; playback remains available.

### Security

- Existing session, role, publication, and subscription checks remain authoritative.
- The server validates progress independently of the browser and never trusts client completion.
- Database writes remain scoped to the authenticated user and requested published video.
- No secrets, storage keys, or other users' progress are returned.

## Acceptance criteria

- At 79 percent, the lesson and Roadmap remain incomplete.
- At 80 percent, the response reports a new completion and matching Roadmap items are completed.
- Repeated checkpoints remain completed without repeating the Roadmap mutation.
- The lesson page displays `Lektion abgeschlossen` and updates its module navigator immediately.
- After a new completion, the page fetches and presents the next Roadmap recommendation.

## Implementation plan

- [x] Harden and extend the watch-progress response.
- [x] Synchronize lesson completion in the Web UI.
- [x] Add backend and frontend regression coverage.
- [x] Run the required verification and review the final diff.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/content`, `apps/web/src/features/video`
