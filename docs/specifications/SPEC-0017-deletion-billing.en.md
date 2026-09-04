# Deletion and billing reconciliation

## Scope

Design produced at the owner's request. Not implemented or approved for production.
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

Current code blocks immediately; scheduled deletion is not implemented. Voluntary
scheduling does not redefine final erasure deadlines. Legal review remains a
production requirement.

## Implemented foundation (not connected to the product)

Pure scheduling, cancellation and due-date rules are implemented in
`packages/backend/src/identity/scheduled-deletion-policy.ts`. They preserve paid
access dates, reject unconfirmed renewal cancellation, disallow cancellation at
or after the deadline and never enable renewal. Immediate deletion is not delayed
by unavailable billing reconciliation; this does not imply processor completion.
Only trusted server code may supply dates and confirmation evidence.

API, persistence, worker and UI are not connected. Review the shared billing
boundary first: an application port in packages/backend used by API and worker,
with provider adapter and durable PostgreSQL operations. Claim/cancel races need
transactional protection, not just pure policy checks.
See [technical design](../../specs/scheduled_deletion_design.md).

## Remaining runtime gaps

SubscriptionService.cancel schedules end-of-period cancellation for the latest
ACTIVE/TRIAL subscription only. The deletion worker has no billing adapter;
its default external processor list is empty. Restore marks deletion complete
without reconciling billing. Webhooks upsert subscription state without checking
deletedAt. Therefore changing a local status alone cannot prove cancellation.

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
- Reviewed shared billing boundary and durable operation schema/ADR.

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

- Foundation verification: 11 new unit tests and `pnpm verify` passed after fixing
  the initial parameterized-test TypeScript error; `git diff --check` passed.
  Integration/E2E/recovery were not rerun: functions are not connected to DB/UI;
  the existing failing billing recovery gate remains open. Applied fullstack-guardian
  security checkpoint; shared billing boundary approval remains a stop condition.
- Status: Product behavior approved; scheduled deletion not implemented; billing design pending
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: worker/privacy.ts, worker/deletion-ledger.ts, SubscriptionService
