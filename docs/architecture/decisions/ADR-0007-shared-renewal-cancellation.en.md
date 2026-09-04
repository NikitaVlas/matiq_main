# ADR-0007: Shared renewal cancellation

## Decision

Accepted by the owner on 2026-09-04. API and worker use a shared application
service in packages/backend, with a provider port and PostgreSQL operation store.
Hosts do not import each other. No production provider is selected.

## Implementation plan

1. Add a durable renewal-operation table through an additive migration.
2. Implement ownership-scoped creation, lease/fencing claims and confirmed results.
3. Read provider state before requesting cancellation; after a timeout, retry by
   reconciling state first. Missing provider fails closed. No provider error text
   is persisted. Stable operation IDs are remote idempotency keys.
4. Add a worker adapter and API application entry point; leave the existing
   public cancellation API unchanged until scheduled-deletion contracts land.
5. Verify with unit tests and synthetic PostgreSQL; no real provider calls.

## Constraints

Provider calls run outside transactions. Claims expire; stale owners cannot
commit. The operation stores only a local subscription reference, not copied
provider identifiers. Completed operations expire after 30 days as technical
metadata; pending operations require reconciliation/escalation, not silent purge.
This does not complete account deletion or erase mandatory finance documents.
UI and schedule persistence are connected; webhooks enqueue reconciliation,
and resume checks schedules and pending operations.
New public actions must enforce ownership, recent reauthentication and CSRF.
No UI may claim success based on an accepted/pending operation.

## Document status

- Status: Accepted; shared operation implemented
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: packages/backend/src/billing, apps/worker, SubscriptionService

## Operational limits

Apply the migration before running the updated worker. The working DB was not
migrated. Poll every minute, batch 25, two-minute lease, five-minute retries.
After 12 failed attempts automatic retries stop; safe reviewRequired counts
indicate manual reconciliation, also for operations with missing subscriptions.
Alert routing/escalation and provider network timeouts remain production gates.
No Subscription FK: unresolved evidence is not cascade-deleted; completed
technical operations expire after 30 days. Unresolved operation cleanup after
investigation requires a separate policy decision. On code rollback retain the
additive table; do not drop live operations. Resume prechecks do not make remote
calls atomic with newly created schedules. Provider event races and recovery of
post-backup changes remain release gates alongside the real provider adapter.
