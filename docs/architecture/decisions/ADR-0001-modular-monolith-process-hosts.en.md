# ADR-0001: Modular monolith with separate process hosts

## Status

Accepted

## Context

MATIQ needs separate public and administrative trust surfaces plus reliable
background work, while one product team needs fast changes and transactional
consistency.

## Decision

Use one NestJS modular monolith with shared domain/application modules and
separate User API, Admin API, and Worker process hosts. Keep web and admin-web as
separate Next.js deployables. Do not introduce microservices in the MVP.

## Alternatives

- One API host: simpler deployment but a wider administrative attack surface.
- Independent services: operational and consistency cost without proven need.
- Duplicated public/admin backends: rejected because rules would drift.

## Consequences

Processes scale and deploy independently, while business logic remains shared.
Module boundaries must be enforced in code and tests. A host failure can be
isolated, but PostgreSQL remains a shared dependency.

## Migration

Extract existing API use cases into shared modules, then add `admin-api`,
`admin-web`, and `worker` hosts without changing existing user contracts.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Backend process hosts and shared modules
