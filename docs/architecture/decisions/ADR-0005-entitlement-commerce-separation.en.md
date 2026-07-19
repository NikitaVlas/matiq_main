# ADR-0005: Separate payment, subscription, and entitlement

## Status

Accepted

## Context

Trial, subscription, and future Premium-course purchases grant access through
different commercial events. Provider-specific status must not leak into every
feature.

## Decision

Model Payment, Subscription, Product/Price, and Entitlement separately. The
server resolves playback access from entitlement. A provider adapter maps
external states into MATIQ states. The no-card trial is internal and never
auto-converts.

## Alternatives

- Read provider status during every playback: fragile and unavailable offline.
- Store access as one user boolean: cannot represent expiry or Premium courses.

## Consequences

Webhooks and reconciliation update domain records idempotently. Access can
remain stable through provider outages. More entities exist, but commercial
evolution does not require rewriting video access.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Billing, subscriptions, entitlement
