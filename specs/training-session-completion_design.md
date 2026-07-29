# Feature: Training session completion

## Requirements

- After video completion, show the saved result, Roadmap advancement, and exactly one primary next
  training action.
- Select that action from Roadmap, lesson path, then related metadata content.
- Explain why the next video is recommended and allow the athlete to end the session.

## Security

- Reuse subscription-protected, authenticated watch and recommendation endpoints.
- Show only the current athlete's completion result and recommendations.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/content`, `apps/web/src/features/video`
