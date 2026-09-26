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

## Measured query correction

The 2026-09-26 load run exposed slow area/position facet queries. PostgreSQL
EXPLAIN ANALYZE on the local test database attributed approximately 945/749 ms
to JIT compilation of the nested OR queries. Separate direct-video and
technique-derived relation queries avoided JIT in the diagnostic plan (less than
1 ms execution each). Split these paths within the same repeatable-read
transaction and merge by ID, preserving global facets, sorting and visibility.
Do not change database-wide configuration or cache responses.

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
- `pnpm verify`: passed on 2026-09-26 (format, architecture, lint, types, units,
  production builds). `eslint scripts/load/*.mjs` and `git diff --check`: passed.
- Full Public Chromium suite: 27 passed; final focused catalog suite: 7 passed,
  including an additional out-of-range-page regression. Mobile pagination
  screenshot reviewed.
- Docker became available on 2026-09-26. Final API integration suite: 17 tests
  passed across eight files, including all five expanded catalog cases. The first
  run exposed a missing required `reactions` array in the lesson fixture; adding
  the empty array fixed setup without changing application behavior or assertions.
- API lint/typecheck, fixture formatting and all three load-measurement unit tests
  passed on 2026-09-26. The measurement tests required subprocess permission
  after an initial sandbox `spawn EPERM` failure.
- Comparative load verification passed after the measured query correction:
  16,188 HTTP requests, no failures, all sample-count checks met, queue drain and
  redelivery deduplication passed, disposable database removed. The initial run
  failed its sample-count gate due to slow facets. Full measurements and limits:
  [RU](../docs/development/catalog-load-2026-09-26.ru.md),
  [EN](../docs/development/catalog-load-2026-09-26.en.md).
- No migrations, dependencies, auth/payment/provider changes or production actions.
  Remote CI and production capacity are not verified by these local checks.

## Document status

- Status: Implemented and locally verified; production verification remains open
- Owner: MATIQ team
- Last reviewed: 2026-09-26
- Related code: content API, catalog/home/video UI, contracts, load harness
