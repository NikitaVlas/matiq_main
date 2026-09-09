# Trial activation and subscription errors

## Scope and authorization

The user approved audit item 1 on 2026-09-09: enforce existing trial requirements
and repair subscription UI error handling. Sources: FR-SUB-001–004,
docs/architecture/commerce.ru.md. No payment-provider changes or migrations.

## Acceptance criteria

- A verified, non-deleted account with completed assessment can explicitly start
  one seven-day trial. Assessment submission never starts it automatically.
- Missing/incomplete assessment and unverified/deleted accounts cannot start it.
- Concurrent or repeated requests preserve the original subscription and dates.
- The UI offers trial only for an account without a subscription that has met
  the prerequisites. Foundation assignment alone does not complete assessment.
- Loading, HTTP/network errors and retries are visible in German. Mutations are
  disabled while pending, failed cancellation stays open, failed refresh never
  claims success. Existing payment terms and endpoints remain unchanged.

## Implementation plan

1. Add API regression tests; serialize activation on the existing user row.
2. Remove assessment's automatic activation and its subscription dependency.
3. Use existing account/assessment endpoints for UI prerequisites, without adding
   response fields. Add bounded requests, safe errors, retry and busy states.
4. Add browser and database-backed negative/concurrency tests, run verification.

## Security checkpoint

Existing session guard and same-origin protections remain. The server derives
user ID from the session and checks stored verification/assessment state; browser
checks are advisory. Parameterized row locking prevents duplicate trial creation.
React escapes messages; raw server errors are not displayed. No new secrets,
providers or dependencies. No financial or production operations are performed.

## Verification

- The new service regressions reproduced the old missing eligibility checks
  before implementation (5 failed, 4 passed); all 9 now pass in the API suite.
- User API integration: 7 files / 12 tests passed against local `matiq_test`.
  The database was already current (35 migrations, none pending). Tests cover
  incomplete assessment, unverified sessions, explicit activation after assessment,
  three concurrent activations producing one row, and replay after expiry.
- Chromium: all 13 pre-existing User Web tests passed. The initial new suite had
  two ambiguous alert selectors due to Next.js's route announcer; selectors are
  now scoped to main. The final 8 new tests pass, including WCAG A/AA scan,
  cancellation/checkout failures, unconfirmed cancellation, busy controls and
  status-refresh retry without a second mutation.
- Final `pnpm verify` and `git diff --check` passed. Unchanged tasks reused
  Turborepo cache; the changed web application was rebuilt. Next.js reports the
  existing advisory about its ESLint plugin not being configured.
- User OpenAPI generation succeeded and `git diff --exit-code -- openapi/user-api.json`
  confirmed unchanged schema. No new API fields, dependencies or migrations.
- Initial integration execution failed because Docker/PostgreSQL was unavailable;
  after the user started Docker the complete API integration suite passed.
- Real external payment providers, production, manual screen-reader and full
  cross-browser testing are outside this local fix. Browser API responses are synthetic.

## Documentation review

This restores the existing commerce requirements, including explicit activation.
Architecture and public response schemas are unchanged; no ADR is needed. API
test scripts include the new unit and integration suites. The graph index missed
the actual assessment caller, so dependencies were verified against source.

## Document status

- Status: Verified locally
- Owner: MATIQ team
- Last reviewed: 2026-09-09
- Related code: SubscriptionService, AssessmentService, SubscriptionPage
