# Catalog pagination and load optimization

## Authorized scope and plan

User accepted the proposed pagination, separate filter options, removal of repeated
catalog seeding and a comparative load run. Existing public API routes stay
compatible. Add `/content/video-page` and `/content/video-facets`; move the public
catalog, home preview and locked-video summary to bounded queries.

1. Validate search (160 chars), facet identifiers (120 chars), page/limit (1–10000,
   1–48; defaults 1/24). Query all matching published videos in PostgreSQL with
   AND-combined filters, stable createdAt-desc/id-asc ordering and total count.
2. Preserve all taxonomy derivations (direct/variant/drill), discipline sources,
   public trainer visibility and literal substring search. Facets are global
   distinct taxonomy options attached to published videos, not page-local.
3. Keep existing catalog seed behavior for first use but share a successful
   initialization promise per API process, retrying on failure. Do not cache data
   responses or repeat upserts on every request.
4. URL-persisted filters/page, debounced search, previous/next controls, loading,
   empty/error/retry states, abort stale fetches, German accessible UI.
5. Regenerate OpenAPI, test real DB pagination/filter/privacy semantics and
   browser navigation/races, then rerun the comparable local load fixture.

## Security and compatibility

Only public summaries, selected explicitly; no storage keys, credentials, private
trainer fields or playback tokens in new responses. Bound and validate all query
input; Prisma parameterized queries with escaped LIKE wildcards. React escapes
text. Existing playback guards and authentication are unchanged. No dependencies,
migrations, provider operations or deployment. Graph lacks current symbols;
source discovery is the documented fallback. Rate limiting policy is unchanged;
bounded pages and search lengths limit this query's work, not overall traffic.

## Acceptance

No full-video-list request in migrated public views; searching/filtering finds
matches beyond page one. Global facets remain available while filtering. Page
changes preserve filters; changes to filters/search reset page. Error and retry
work without displaying a stale response. Existing routes and other screens work.
Measurements report payload and latency without inventing production SLOs.

## Implementation and verification

- Added public page/facet DTOs and OpenAPI routes. Page defaults to 24 videos,
  maximum 48; all eight filters apply in the database with a consistent total.
- Public home requests 12 summaries; locked video requests one by ID. Existing
  unbounded endpoints remain compatible for other consumers.
- Global facet queries select only names/IDs from taxonomy attached to published
  videos, rather than retrieving every video description. No persistent cache.
- Legacy taxonomy initialization is shared per process and retried after failure.
- Catalog preserves page/filter URLs, debounces search, aborts obsolete requests
  and provides navigation, error/retry and reset from out-of-range pages.
- CI integration database uses the explicitly disposable `matiq_test` name.
- `pnpm openapi:generate`: passed after adding explicit Swagger primitive types.
- `pnpm verify`: passed on 2026-09-21 (format, architecture, lint, types, units,
  production builds). `eslint scripts/load/*.mjs` and `git diff --check`: passed.
- Full Public Chromium suite: 27 passed; final focused catalog suite: 7 passed,
  including an additional out-of-range-page regression. Mobile pagination
  screenshot reviewed.
- Initial focused API run on 2026-09-20: 8 tests passed. The expanded final
  integration run on 2026-09-21 could not reach PostgreSQL because Docker Desktop
  failed to start. The comparative load run remains pending for the same reason.
- No migrations, dependencies, auth/payment/provider changes or production actions.
  Remote CI and production capacity are not verified by these local checks.

## Document status

- Status: Implemented; final DB and load verification pending
- Owner: MATIQ team
- Last reviewed: 2026-09-21
- Related code: content API, catalog/home/video UI, contracts, load harness
