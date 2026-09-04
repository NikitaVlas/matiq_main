# SPEC-0016: Browser and security regression coverage

## Scope and acceptance

Approved next slice: existing critical browser journeys, basic keyboard/mobile
checks, and negative GDPR status tests. No production or authorization changes,
and no new dependencies.

1. Reproduce network failure and excessive deletion-status polling.
2. Use initial status loading plus explicit refresh. Announce errors and release
   the busy button on failure; never expose the token in URL/localStorage.
3. Check keyboard retry, mobile overflow and main/heading semantics; update
   outdated profile and heartbeat fixtures without removing journey assertions.
4. Test completed and expired requests against the local API/database.
5. Run the full browser suite and record limitations.

Mocked browser APIs do not prove full-stack integration. This is neither a full
WCAG audit nor a penetration test; production gates remain open.

## Document status

- Status: Implemented; browser/API verified locally
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: e2e, deletion status page, account deletion integration tests

## Results

Six browser tests and GDPR API integration passed. Initial API startup timed out
under concurrent browser load; isolated retry passed without increasing timeouts.
Initial browser failures reproduced two defects and exposed stale fixtures.
Remote CI has not run. See the 2026-09-04 security review for remaining risks.
