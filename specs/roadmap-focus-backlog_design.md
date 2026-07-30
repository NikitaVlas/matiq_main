# Feature: Focused Roadmap and recommendation backlog

## Requirements

- Assessment may retain every relevant recommendation, but the active Roadmap shall not overwhelm
  the athlete with the complete result set.
- The active plan shall contain one primary focus and at most two next directions.
- The primary focus shall prefer a development gap with published content, then another gap, then
  any actionable recommendation.
- The next directions shall balance a supporting gap with an established strength or selected goal
  when those signals exist.
- Remaining recommendations shall stay available in a collapsed backlog rather than being deleted.
- Completed, hidden, manually added, and reordered Roadmap state shall remain intact.

## Architecture

### Frontend

- Derive the focused view from the authenticated Roadmap response without changing stored results.
- Render `Jetzt trainieren`, `Danach`, and collapsed `Später bearbeiten` groups.
- Provide one primary `Training starten` action when matching content exists.
- Keep existing detail, reorder, hide, restore, completion, and progress controls.

### Backend

- No persistence or API contract change is required for the focused presentation.
- Assessment remains the complete deterministic source of recommendations.

## Acceptance criteria

- [x] A Roadmap with twenty unfinished recommendations shows only three active topics initially.
- [x] The remaining seventeen recommendations are retained in a collapsed backlog.
- [x] An actionable development gap is selected before an uncovered gap.
- [x] Active topics retain links, progress, ordering, and hide controls.
- [x] Completed and hidden recommendations remain accessible in their existing sections.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-30
- Related code: `apps/web/src/app/roadmap`, `apps/web/src/features/roadmap`
