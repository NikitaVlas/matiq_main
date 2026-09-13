# Deletion and recovery hardening

## Approved scope

User request 2026-09-13: implement launch step 4 within the agreed local scope,
before external providers are selected. Preserve SPEC-0017 and ADR-0007.

## Plan and acceptance

1. Immediate, scheduled and restored deletion enqueue durable cancellation for
   every linked subscription and revoke local entitlement in the same transaction.
2. Erasure never treats a queued cancellation as provider confirmation. Complete
   local erasure even while external work is pending; preserve identifiers needed
   for reconciliation until their separate retention design is approved.
3. Restore never invents a completed receipt from legacy ledger data or trusts a
   completed receipt while provider references have returned from backup.
4. Reject malformed ledgers before any write. Apply snapshots idempotently and
   recreate missing renewal work, including cancellation of a schedule after backup.
5. Test database recovery, duplicate jobs, provider failures and other-account
   isolation. Keep existing recovery findings visible; do not weaken launch gates.

## Security checkpoint

No public authorization or API contract changes. Existing owner checks,
reauthentication and User row locks remain. SQL is parameterized; external calls
stay outside transactions and their errors must not expose provider payloads.
Tests use synthetic local databases and fake processors only. No real payment,
production deletion, schema migration or new retention policy is authorized here.
Financial documents are unchanged. Existing German status UI must keep showing
pending while cancellation/erasure remains unresolved.

## Verification and remaining gates

- `pnpm verify`: passed (format, architecture, lint, types, unit tests, builds).
- `pnpm e2e --workers=1`: 24 passed, including immediate/scheduled deletion,
  pending status, cancellation retry and subscription flows.
- User API integration: 12 passed, including multiple linked subscriptions and
  immediate local cancellation plus durable pending operations.
- Worker PostgreSQL/Redis integration: 7 passed, including actual queued deletion
  and restored deletion. Explicit due dates remove host/Docker clock dependence
  from synthetic fixtures; no runtime scheduling assertions were relaxed.
- Recovery run `2d23275d277cc95aa71649d1`: 26 checks passed in 26.874 seconds.
  Overall FAILED remains only for `provider_identifiers_remain_linked`. Missing
  provider, timeout after remote success, processor errors and retained-link
  completion blocking are explicitly checked. No failure gate was removed.
- Initial checks caught a stale built backend package, a lint issue and a Prisma
  inferred-type issue in the drill; fixed and verified in the complete rerun.
- Knowledge graph was stale (new deletion symbols absent); source fallback used.
- No schema or HTTP contract changed; migration and OpenAPI regeneration are not
  applicable. Admin UI unchanged; no separate Admin browser run required.
- Production provider calls, provider-link retention/mapping, financial-document
  isolation and real-scale EU backup/queue operations remain release gates.
  This slice does not close the entire fourth launch step.
- Documentation/diff reviewed. No new dependencies or temporary source files.

## Document status

- Status: Local scope implemented and verified; external release gates pending
- Owner: MATIQ team
- Last reviewed: 2026-09-13
- Related code: shared renewal store, deletion execution, worker recovery
