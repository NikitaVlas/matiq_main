# Scheduled deletion design

Implementation design: [RU](../docs/specifications/SPEC-0017-deletion-billing.ru.md),
[EN](../docs/specifications/SPEC-0017-deletion-billing.en.md).

## Plan and boundaries

1. Implement pure, deterministic scheduling/cancellation rules in the existing
   shared backend package; cover dates, provider confirmation and terminal states.
2. Shared billing port and durable operation schema approved in ADR-0007;
   operation store, internal API producer and polling worker implemented.
3. Add additive persistence, authenticated API and worker claim/cancel transactions.
4. Connect German settings UI through generated contracts; verify integration/E2E.

## Frontend

Implemented GET/POST/DELETE /auth/account/deletion-schedule with
allowlisted responses and reauthentication for mutations; persist one schedule
per user and renewal operations atomically. Worker claims due schedules under
the same User row lock used by cancellation, blocks access, revokes credentials
and enqueues the existing local-erasure event. Never claim processor completion
while billing references remain unresolved. Keep DELETE /auth/account compatible.
Show pending provider confirmation separately from scheduling. Test real SQL,
authenticated API and browser errors/cancellation before declaring completion.

The German settings UI shows date, renewal confirmation and separate immediate deletion.
Canceling deletion must not resume renewal. Show loading/error states, keyboard
controls and server results without optimistic confirmation of financial effects.

## Backend

PostgreSQL persistence derives dates from server-side paid periods. Mutations
and due execution lock the same User row; cancellation checks database wall time
after acquiring that lock. Due execution atomically blocks the account, revokes
credentials, creates a receipt/tombstone and queues existing product erasure.
Schedule cancellation never resumes renewal. Late webhooks enqueue renewal
reconciliation; deleted users cannot regain ACTIVE local subscription state.
Provider confirmation is separate from accepting a schedule.

## Security checkpoint

Schedule/cancel/immediate actions require current-user ownership, recent
reauthentication, existing CSRF/rate-limit protections, allowlisted DTOs and audit
events. Never accept paidUntil or provider confirmation from browser input.
Provider calls occur outside transactions with durable idempotent reconciliation.
No real provider call, production operation or refund was performed during
verification; erasure tests use synthetic fixtures. Domain errors contain stable
codes, not account/payment identifiers. Recovery of post-backup schedule changes,
remote-call races and external deletion confirmation remain release gates.

## Document status

- Status: Local scheduling API/UI and execution implemented; production gates pending
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: packages/backend/src/identity/scheduled-deletion-policy.ts
