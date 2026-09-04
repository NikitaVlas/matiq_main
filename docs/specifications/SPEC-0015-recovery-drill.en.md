# SPEC-0015: PostgreSQL recovery drill

## Scope and plan

Approved next slice: automate backup/restore evidence and prepare launch/security
checklists. No production, provider or user-data changes.

1. Create two uniquely named disposable databases in local Compose PostgreSQL.
2. Apply SQL migrations and seed a synthetic profile plus a control account.
3. Perform pg_dump, then serialize a separate post-backup deletion ledger.
4. Restore into the second database and prove the old profile exists there.
5. Apply the ledger twice and assert suppression plus control-account preservation.
6. Drop only databases created by this run and write safe JSON evidence.

## Acceptance criteria

- No production URL or existing target database parameter is accepted.
- pg_restore stops on error.
- Check/cleanup failures return nonzero exit status and failed evidence.
- Evidence includes revision, timestamps and checks, never dumps, ledger or PII.
- This is not production DR certification; RPO/RTO require owner decisions.

## Document status

- Status: Metadata fixed; subscription review still failing
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: apps/worker/src/recovery-drill.ts

## Verification 2026-09-04

- Current run `256c4923f199a1628b121d51`: 31.4 s, metadata finding resolved;
  subscription/provider findings remain FAILED. Shared helper used by both deletion
  paths; `pnpm verify` passed. Billing design: [SPEC-0017](SPEC-0017-deletion-billing.en.md).

- Latest extension `6b7dd26ea4098632354b1e8b`: FAILED, 30.3 s. Playback,
  heartbeats and verified intervals are erased; audit metadata identifiers and
  active subscription provider links remain. Both ledger replays and control
  checks passed. Runtime remediation requires separate approval; no financial
  policy was inferred. Worker lint/typecheck passed; full verify was not rerun.

- Approved audit restore fix: replace actor/entityId references transactionally
  using the ordinary deletion rule; preserve other event fields and control rows.
- Expanded run `fff64e5c488bec9e91ed8668`: PASSED, 32.7 s, uncommitted local
  implementation. Covers credentials, viewing history, audit references and
  repeated replay. `pnpm verify` passed. No migration or public API change.
- Metadata, financial/provider cleanup and complete unlinkability remain outside
  this verification; browser E2E and other integration suites were not rerun.

Earlier baseline results:

- `pnpm verify`: passed after strict TypeScript fixes.
- `pnpm --filter @matiq/worker test:recovery`: passed, 23.6 s.
- Evidence run ID: `66e5d17072dd6e4eb99894bf` (uncommitted local implementation).
- `git diff --check`: passed.
- Docker unavailability produced a FAILED/preflight report as expected.
- CI job added but not executed remotely. Browser E2E and a full security review
  were not performed in this infrastructure-only slice.
