# Recovery drill

Start local Compose PostgreSQL and generate the Prisma client, then run
`pnpm --filter @matiq/worker test:recovery`.

The command creates two unique local databases, applies SQL migrations, seeds
synthetic fixtures, performs pg_dump/pg_restore, and reapplies a separately
serialized post-backup deletion ledger twice. It checks profile suppression and
preservation of a control account, then drops only databases created by this run.
It does not accept production URLs. Dump and ledger stay in process memory.

The expanded drill also checks sessions, verification/reset tokens, viewing
history, audit actor/entityId replacement and control records. The failure at
`audit_pseudonymisation` was fixed on 2026-09-04; expanded run
`fff64e5c488bec9e91ed8668` passed, including both replays. This does not prove
metadata scrubbing or irreversible unlinkability across retained records.

Evidence is stored in `test-results/recovery/<runId>.json`; success requires
exit code 0 and PASSED. Failure records only the stage, never raw database errors
or PII. On cleanup failure inspect only databases identified by that run ID;
never bulk-delete by prefix. CI retains evidence for 30 days.

Production recovery must keep traffic and workers disabled, restore into an
isolated EU environment, retrieve the latest independent ledger (including
post-backup deletions), apply suppression, verify consistency and provider state,
record evidence, and obtain owner approval before reopening traffic.

This drill does not certify production RPO/RTO, video recovery, external providers,
or independent ledger storage. Those remain launch gates.

## Document status

- Current run `256c4923f199a1628b121d51`: metadata scrubbed, still FAILED for
  subscriptions/provider links. See [SPEC-0017](../specifications/SPEC-0017-deletion-billing.en.md).
- The next entry is historical evidence before the metadata fix.
- Latest extension: run `6b7dd26ea4098632354b1e8b` FAILED at
  `remaining_privacy_review`: audit metadata identifiers and active subscription
  provider links survive. Playback/heartbeats/interval erasure passes. Evidence
  now includes safe finding codes; earlier PASSED reports do not cover these checks.
- Status: Active local runbook; production gates pending
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: apps/worker/src/recovery-drill.ts
