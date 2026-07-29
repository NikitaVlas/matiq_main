# Feature: Style-aware Assessment and editable Roadmap inputs

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-29
- Related code: `apps/api/src/modules/assessment`, `apps/web/src/screens/assessment`, `apps/admin-api/src/modules/assessment`, `apps/admin-web/src/screens/assessment`

## Requirements

- While an athlete completes an Assessment, when answers are submitted, the system shall consider strengths, preferred game, goals, and gaps.
- While a question allows multiple values, when the athlete selects answers, the system shall preserve every selected mapped value.
- While a permitted answer is missing from the catalogue, when the athlete enters another value, the system shall store it as `UNMAPPED` without using it for automatic recommendations.
- While an administrator reviews an unmapped answer, when it is linked to a Roadmap topic, the system shall mark it mapped and permit deterministic Roadmap recalculation.
- While an athlete edits completed answers, when the Assessment is submitted again, the system shall refresh generated recommendations without deleting manual steps, viewing completion, hidden state, or retained custom order.

## Architecture

### Frontend

- The athlete Assessment supports single choice, multiple choice, and optional custom text.
- Existing answers are loaded and prefilled.
- The UI explains that edits update the current Roadmap and handles loading, validation, errors, and success.
- Admin Assessment management provides question authoring and an unmapped-answer review queue.
- Assessment mappings use the shared DB-driven Roadmap topic catalogue instead of free-form keys.

### Backend

- Questions carry `CONFIDENCE`, `PREFERENCE`, or `GOAL` intent.
- Options may map to a Roadmap skill and recommendation type.
- `CORE` represents the athlete's established game, `GAP` a blocking weakness, and `EXPLORE` a chosen direction.
- Free text is stored with `UNMAPPED`; it is excluded from scoring until an administrator maps it.
- Roadmap reconciliation updates retained generated items instead of deleting them wholesale.

### Security

- Athlete endpoints use the existing authenticated user guard and scope reads/writes to the session user.
- Admin endpoints use the existing MFA-backed admin session; mutations require `ADMIN`.
- DTO validation limits keys, labels, custom text, option counts, and numeric values.
- Admin API rejects Assessment mappings that do not exist in the Roadmap topic catalogue.
- Responses expose no credentials or unrelated user data; audit entries record admin mutations and mappings.

## Acceptance criteria

- [x] Positive and negative signals produce typed Roadmap recommendations.
- [x] Multiple answers and custom unmapped answers persist.
- [x] Completed answers can be edited and are prefilled.
- [x] Roadmap recalculation preserves manual and retained user state.
- [x] Admin can create/edit/deactivate questions and map unknown answers.
- [x] Relevant API, UI, migration, tests, OpenAPI, and documentation are updated.

## Implementation plan

- [x] Extend the database model with question intent, mapping state, and recommendation type.
- [x] Implement deterministic submission and Roadmap reconciliation.
- [x] Add athlete editing UI.
- [x] Add validated Admin management APIs and UI.
- [x] Add tests, generate contracts, and run verification.

## Verification notes

- Database migration, package type checks, lint, API tests, Admin API tests, OpenAPI generation, and diff checks were completed during implementation.
- On the final pass, active Windows development processes prevented TypeScript cache writes and Vitest worker creation. These environmental failures do not replace the successful earlier verification and should be rerun after stopping the development servers.
