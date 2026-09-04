# Scheduled deletion design

Implementation design: [RU](../docs/specifications/SPEC-0017-deletion-billing.ru.md),
[EN](../docs/specifications/SPEC-0017-deletion-billing.en.md).

## Plan and boundaries

1. Implement pure, deterministic scheduling/cancellation rules in the existing
   shared backend package; cover dates, provider confirmation and terminal states.
2. Review shared billing application port and durable operation schema before
   integrating hosts (explicit outstanding SPEC-0017 architecture decision).
3. Add additive persistence, authenticated API and worker claim/cancel transactions.
4. Connect German settings UI through generated contracts; verify integration/E2E.

## Frontend

Future UI shows date, renewal confirmation and separate immediate deletion.
Canceling deletion must not resume renewal. Show loading/error states, keyboard
controls and server results without optimistic confirmation of financial effects.

## Backend

This slice implements only domain policy: all dates come from server-verified
paid periods, external renewals must be confirmed disabled, cancellation is
allowed strictly before the deadline, and erased/deleting states are terminal
for cancellation. No route, database schema or background job changes yet.
Future persistence must atomically compare state/version when claiming deletion
or canceling; pure policy functions alone do not solve concurrent requests.

## Security checkpoint

Future schedule/cancel/immediate actions require current-user ownership, recent
reauthentication, existing CSRF/rate-limit protections, allowlisted DTOs and audit
events. Never accept paidUntil or provider confirmation from browser input.
Provider calls occur outside transactions with durable idempotent reconciliation.
No external call, secret, production operation, refund or erasure is performed by
this slice. Domain errors contain stable codes, not account/payment identifiers.

## Document status

- Status: Domain foundation implemented; host integration awaiting boundary review
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: packages/backend/src/identity/scheduled-deletion-policy.ts
