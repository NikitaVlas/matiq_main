# MATIQ Trial, Subscription, Premium Courses, and Payments

## Commercial products

| Product              |                          MVP | Entitlement                                |
| -------------------- | ---------------------------: | ------------------------------------------ |
| Seven-day trial      |                          Yes | Main library for a limited period          |
| Monthly subscription |                          Yes | Main library through the paid period       |
| Premium course       | Modelled now; sold after MVP | Per-course perpetual or contractual access |

Currency is EUR and the first market is Germany. Price, applicable tax, refund
policy, and the payment provider require approval before production payments.

## Trial

- available once after registration, email verification, and assessment;
- activated by an explicit user action;
- requires no card;
- lasts exactly 7 × 24 hours from server-side `startedAt`;
- never renews or automatically becomes a subscription;
- leaves profile, Roadmap, and catalogue available while locking playback;
- reasonable anti-abuse controls limit repeat registration.

States: `NOT_ELIGIBLE`, `ELIGIBLE`, `ACTIVE`, `EXPIRED`, `REVOKED`.

## Subscription

The monthly subscription renews automatically only after explicit purchase.
Before payment confirmation the user sees the EUR price, period, tax/total,
next charge date, renewal terms, and cancellation method.

Domain states:

- `INCOMPLETE`;
- `ACTIVE`;
- `PAST_DUE`, subject to an approved grace period;
- `CANCEL_AT_PERIOD_END`, with access until `currentPeriodEnd`;
- `CANCELED`;
- `PAUSED`, only if separately approved.

An adapter maps provider states into domain states so the UI and domain do not
depend on provider terminology.

## Checkout and payment states

```text
Plan selection → Order review → Checkout → Processing
                                      ├─ Success
                                      ├─ Failed
                                      └─ Cancelled
```

- A success redirect is not proof of payment.
- A verified webhook plus provider reconciliation is the source of truth.
- Webhooks are signature-verified and idempotent.
- `Processing` grants no access without a confirmed entitlement.
- Retrying checkout must not create a duplicate charge.
- Failure provides a safe explanation and retry path.
- Cancelling checkout does not cancel an existing subscription.

## Cancellation and management

The profile links to subscription management with status, price, next charge,
and invoice history. Cancellation requires separate confirmation, disables
renewal, and preserves access through the paid period. Resumption is allowed
before `currentPeriodEnd` where supported. An administrative adjustment
requires a permission, re-authentication, reason, and audit event.

## Premium courses

A Premium course is a separate commercial product, not a special video status.
The model anticipates `Product`, `Price`, `Order`, `Payment`, `Entitlement`,
and a course-scoped entitlement. In the MVP:

- Admin may classify and preview Premium courses;
- separate sales and automated revenue distribution remain disabled;
- the standard library stays subscription-based;
- enabling sales requires a specification for tax, refunds, access duration,
  and trainer share.

## Invariants

- Money uses minor units and an ISO currency.
- Payment, subscription, and entitlement are separate entities.
- The server resolves entitlement.
- Financial events are immutable; corrections use compensating operations.
- Time boundaries are stored in UTC and displayed locally.

## Open questions before production

- Price, VAT, merchant details, invoices, and refunds.
- Payment provider and DPA.
- Grace period and retry schedule.
- Premium access terms.

## Document status

- Status: Approved MVP baseline; commercial parameters pending
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Billing, payments, subscriptions, entitlements
