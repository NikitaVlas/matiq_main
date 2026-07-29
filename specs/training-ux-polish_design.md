# Training UX polish

## Goal

Make the Assessment and Roadmap training flow understandable and reliable on desktop and mobile without changing routes, business rules, or the existing MATIQ visual identity.

## Scope

- Show layout-matched loading placeholders for Assessment, Roadmap, and Roadmap detail.
- Show contextual errors when Roadmap loading or updates fail.
- Prevent duplicate Roadmap mutations while a request is in progress.
- Keep Roadmap controls readable and operable on narrow screens.
- Preserve keyboard focus visibility and reduced-motion behavior.

## Acceptance criteria

- Users receive visible feedback during every covered load and save operation.
- Failed Roadmap requests do not silently leave stale UI.
- Reorder, hide, restore, complete, and reopen actions cannot be submitted twice concurrently.
- Relevant controls fit a 320-pixel-wide viewport without horizontal page overflow.
- Existing URLs, API contracts, authorization, and recommendation logic remain unchanged.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/web/src/screens/assessment`, `apps/web/src/app/roadmap`, `apps/web/src/features/roadmap`, `apps/web/src/app/globals.css`
