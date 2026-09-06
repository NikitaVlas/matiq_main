# Deletion and billing reconciliation

## Scope

Local workflow implemented at the owner's request; not approved for production.
No provider selection, real billing calls, refunds, migrations or accounting
record deletion are authorised by this document.

## Approved behavior (2026-09-04)

- Disable renewal immediately; preserve access and data until the paid period
  ends. Schedule deletion for that date and display “Deletion scheduled”.
- Before that date the user may cancel scheduled deletion. This is not recovery
  of erased data. Canceling deletion does not enable renewal; resubscribing is
  a separate explicit action.
- Start final deletion on the scheduled date unless canceled. After final
  deletion, recovery is impossible.
- Offer a separate “Delete now” choice that blocks the account and starts erasure
  without waiting for paid access to expire; never substitute deferred deletion.
- Ordinary cancellation does not automatically refund the payment because paid
  access remains available. Statutory withdrawal/refund rights are unaffected;
  refunds, disputes and outstanding invoices are handled separately.
- Only provider confirmation establishes successful renewal cancellation.
- Without a remaining paid period there is no paid-period deferral.

Separate immediate and scheduled deletion paths are implemented. Voluntary
scheduling does not redefine final erasure deadlines. Legal review remains a
production requirement.

## Implemented local workflow

Pure scheduling, cancellation and due-date rules are implemented in
`packages/backend/src/identity/scheduled-deletion-policy.ts`. They preserve paid
access dates, reject unconfirmed renewal cancellation, disallow cancellation at
or after the deadline and never enable renewal. Immediate deletion is not delayed
by unavailable billing reconciliation; this does not imply processor completion.
Only trusted server code may supply dates and confirmation evidence.

Shared billing boundary accepted: [ADR-0007](../architecture/decisions/ADR-0007-shared-renewal-cancellation.en.md).
Implemented provider port, PostgreSQL operation store, internal API
requestRenewalCancellation entry point and one-minute worker polling. Added
GET/POST/DELETE /auth/account/deletion-schedule, German settings UI and due-date
execution. The server derives the deadline from paid periods.
API acceptance is not cancellation success; worker without a provider cannot
confirm external cancellation. Fake adapters exist only in tests. Scheduling,
cancellation and execution share a User row lock. Cancellation is strictly
before the deadline; repeated execution cannot create another deletion request.
See [technical design](../../specs/scheduled_deletion_design.md).

## Remaining runtime gaps

SubscriptionService.cancel schedules end-of-period cancellation for the latest
ACTIVE/TRIAL subscription only. The deletion worker has no billing adapter;
its default external processor list is empty. Ordinary processing refuses to
complete receipts with external references but no processors. Legacy restore
still completes without billing reconciliation. Late webhooks retain CANCELED
for deleted users and enqueue reconciliation, without extending scheduled dates.
Checkout/resume reject schedules or pending operations; remote-call races and
provider event ordering still need full verification. Ledger v2 replays schedule
creation and cancellation after backup while v1 stays compatible without that
capability. Reapply changes a restored deleted account's local subscription to
CANCELED, but this does not prove provider cancellation.

## Proposed implementation sequence

1. Separate scheduled and final deletion. Preserve paid access while scheduling
   and persist renewal cancellation for every subscription. Block and erase only
   at the scheduled date or on “Delete now”; do not claim completion beforehand.
2. Retain provider references in restricted operational storage until confirmation.
   Use an internal billing port shared by deletion and recovery; no direct worker
   dependency on an API host. Review this boundary before implementation.
3. Request cancellation with a stable operation key outside database transactions.
   Verify provider state explicitly; a timeout or missing adapter is pending,
   never success. Retry with backoff and escalate exceptions within approved
   deletion deadlines. An ambiguous response is reconciled before retrying.
4. Prevent late/duplicate/out-of-order webhooks from restoring product access or
   renewal for a deleted account. Retain the minimal restricted reconciliation
   mapping needed for this; define its lifetime before erasing provider references.
5. Confirm processor erasure separately from subscription cancellation. Only
   complete the deletion receipt when every required processor confirms.
6. Preserve legally retained agreements, invoices and payout documents unchanged
   in this slice. Design their segregated retention/access separately; do not
   cascade-delete them or pretend their mandatory User relations are unlinked.
7. After restore, re-establish pending operations from the independent ledger and
   reconcile provider state before enabling traffic or side-effect workers.

## Decisions required before runtime implementation

- Refund and outstanding invoice handling, including the “Delete now” path.
- Approved provider, adapter and cancellation/erasure confirmation capabilities.
- Restricted reconciliation mapping, retention category, owner and schema; how
  late webhook events remain attributable after product identifiers are removed.
- Approved adapter wiring and migration rollout; shared boundary is accepted in ADR-0007.

## Required tests

Multiple subscriptions; local trial without a provider; unavailable adapter;
timeout followed by confirmed cancellation; duplicate delivery; process crash
between remote success and local commit; webhook replay after deletion; restore
of pre-deletion billing state; unchanged control account and accounting records.
Recovery must remain failing while provider reconciliation is unresolved.

## Audit metadata change in this slice

Ordinary deletion and restore share one transactional helper. For rows linked
through actor, entityId or the existing subject actor, metadata is set to SQL NULL
and actor/entityId are pseudonymised. Keep id/action/entity/createdAt as the
minimum event. Do not guess safe JSON fields; arbitrary nested data is discarded.
Unrelated rows are untouched. Metadata-only references without those ownership
links and broader irreversible unlinkability are not covered by this helper.

## Document status

- 2026-09-06 slice: deletion ledger v2 restores schedule creation and cancellation
  after backup; v1 remains readable. Restored deleted accounts no longer retain an
  ACTIVE local subscription. Incomplete receipts remain incomplete and are requeued
  instead of being falsely completed. Worker unit/typecheck passed. Recovery run
  `2d2416c643a3e42f4b72b346` passed every new check; overall FAILED remains only
  for `provider_identifiers_remain_linked`. Real payment integration is intentionally
  deferred. Full
  `pnpm verify` and `git diff --check` passed.
- Current slice: API, UI and due-date executor implemented. API integration:
  3 passed; E2E: 7 passed. Migrations applied only to disposable test databases.
  Recovery `1e2672a459c615b4d22fffbb`: new schedule checks passed; overall FAILED
  remains for previous subscription/provider findings. Entries below are
  historical evidence from earlier slices. `pnpm verify` and `git diff --check`
  passed. Applied fullstack-guardian security checkpoint. Graph discovery returned
  no new symbols; source inspection was used as fallback.
- Final `pnpm verify` and `git diff --check` passed.
- Current slice: shared mechanism implemented, 7 unit tests added. Prisma validate
  passed with local DATABASE_URL after initial network/missing-URL failures.
  New migration applied only to disposable recovery databases, not the working DB.
  Run `2ac5621c881ee1051feb7e6c` (26.9 s) verified restored operations, ownership,
  request deduplication, lease fencing and confirmation without repeated provider
  calls. Overall FAILED for pre-existing subscription/provider findings.
  E2E and other integration suites were not run; public contracts are unchanged.
  Previous-slice verification follows below.
- Foundation verification: 11 new unit tests and `pnpm verify` passed after fixing
  the initial parameterized-test TypeScript error; `git diff --check` passed.
  Integration/E2E/recovery were not rerun: functions are not connected to DB/UI;
  the existing failing billing recovery gate remains open. Applied fullstack-guardian
  security checkpoint; shared billing boundary approval remains a stop condition.
- Status: Local scheduled deletion implemented; production provider and recovery gates pending
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: worker/privacy.ts, worker/deletion-ledger.ts, SubscriptionService
