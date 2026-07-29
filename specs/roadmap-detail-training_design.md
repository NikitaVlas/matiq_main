# Feature: Actionable Roadmap step detail

## Requirements

- Group matching videos into required, recommended, and optional sections.
- Show per-video viewing progress, course, module, and continuation action.
- Continue training with the first unfinished required video, then recommended, then optional.
- Allow the athlete to manually complete, reopen, or hide their own Roadmap step.

## Security

- Detail and mutation endpoints verify Roadmap ownership through the authenticated athlete profile.
- Responses expose only the current athlete's aggregate and per-video viewing state.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/assessment`, `apps/web/src/features/roadmap`
