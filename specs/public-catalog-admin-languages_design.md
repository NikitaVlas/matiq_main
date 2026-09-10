# Public catalog and administrator languages

## Approved scope

User request 2026-09-10: complete launch-plan step 2 and add German/Russian
switching exclusively in Admin Web. This explicitly supersedes the former
German-only admin requirement. Athlete/Public/Trainer Web remain German.

## Acceptance criteria and plan

1. Public home displays published videos and trainers in accessible horizontal
   collections, with catalog/detail/profile links, sign-in and registration.
2. Video catalog includes every published video once, including videos linked
   only through variant/movement/drill. AND-combined filters cover discipline,
   trainer, game area, position, skill group, technique, movement and drill;
   search, clear filters, no-results, loading, error and retry are available.
3. Add a backward-compatible public video summary endpoint with explicit
   field selection. It exposes no storage keys, playback tokens or private
   trainer/account fields. Existing playback authorization is unchanged.
4. Admin language defaults to German, can switch to Russian on every admin
   screen, persists locally, updates document language and does not reset forms.
   Translate controls, accessibility labels, statuses, errors and formatting.
   Stored editorial content, IDs and API enum values are never translated.
5. Preserve existing visual conventions with compact light layouts. No new
   libraries, artificial content, payment/provider changes or deployment.

## Security checkpoint

Public queries select published records and public trainer profiles only. Filters
operate on safe summaries; no new authorization decisions move to the client.
React escapes editorial content and translations. Language persistence contains
only de/ru and is scoped to Admin Web. Protected actions retain existing guards.

## Verification plan

API tests for all video relations and exclusion of private fields; filter tests;
browser home/catalog/no-results/retry/mobile checks; Admin language persistence,
form preservation, representative screens and accessibility tests. Regenerate
OpenAPI clients; run verification, User/Admin E2E and relevant integration tests.

## Implementation notes and limits

- `GET /content/videos` supplies safe summaries and taxonomy facets directly from
  published videos; existing catalog/playback contracts remain compatible.
- Filtering is client-side across published summaries. Pagination and production
  load validation belong to the launch-readiness step.
- The current video model has no public thumbnail field. Video cards therefore
  use neutral typography; trainer photos use the published profile URL when set.
- Admin-only language storage is `matiq-admin-language`. It stores only `de`/`ru`.
  Editorial content and API enum values remain unchanged.
- Knowledge-graph discovery was attempted; the current project index was stale.
  Relevant implementation was verified against source as the documented fallback.
- Browser tests use synthetic API responses. Real PostgreSQL integration verifies
  the new endpoint and privacy exclusions; external providers are outside this step.

## Verification results

- Final `pnpm verify`: passed (format, architecture, lint, types, unit tests and
  production builds). The API startup timeout did not recur on the full rerun.
- `pnpm openapi:generate`: passed; additive public summary contract regenerated.
- `pnpm e2e --workers=1`: 24 passed, including home, all eight filters, URL
  persistence, no results, retry and mobile WCAG checks.
- `pnpm e2e:admin --workers=1`: 2 passed, including DE/RU persistence across
  every section, unchanged form/API values and absence of browser exceptions.
- `pnpm --filter @matiq/api test:integration` with local `matiq_test`: 12 passed.
- Visual review: desktop home, mobile catalog and Russian admin screenshots.
- Intermediate failures: filter label association was corrected; admin test
  fixtures were corrected to match diagnostics/finance response shapes. A parallel
  browser run hit a dev-server Webpack error; the complete sequential run passed.
  Two API startup tests hit their existing five-second timeout during an
  intermediate verification run; the unchanged full rerun passed.
- No migrations, dependency installations, external provider actions or production
  changes were needed. Full provider E2E and load testing remain in launch steps 5–6.

## Document status

- Status: Implemented and verified; approved by user request
- Owner: MATIQ team
- Last reviewed: 2026-09-10
- Related code: User catalog API, Public Web, Admin Web
