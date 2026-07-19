# ADR-0002: One PostgreSQL database with module ownership

## Status

Accepted

## Context

Assessment, Roadmap, entitlement, viewing, and reporting have related
transactional data. Separate databases would add distributed consistency before
independent services exist.

## Decision

Use one EU-hosted PostgreSQL cluster and one migration history. Each module owns
its tables and repositories. Cross-module reads/writes go through public
application services or events. Redis is never the sole source of product state.

## Alternatives

- Database per module: premature operational and consistency cost.
- Shared tables with unrestricted repositories: easy initially but destroys
  boundaries.

## Consequences

Transactions remain simple and backups centralised. Ownership is enforced by
code review, architecture tests, and repository placement rather than database
credentials. Later extraction requires an explicit migration ADR.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Prisma schema, repositories, migrations
