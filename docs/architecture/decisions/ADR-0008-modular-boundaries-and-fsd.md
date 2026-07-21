# ADR-0008: Modular backend boundaries and FSD frontend layers

## Decision

The NestJS backend remains a modular monolith. Feature modules own their
application services, controllers, DTOs, and repositories. Cross-module access
uses application services rather than direct Prisma access.

The web applications follow Feature-Sliced Design: `pages`, `widgets`,
`features`, `entities`, and `shared`. Next.js `app` is treated as a routing and
composition layer only.

## Current migration

Identity, assessment, content, subscription, and athlete-profile entry points
are grouped under `apps/api/src/modules`. Existing implementation files remain
temporarily as compatibility sources while imports are migrated incrementally.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-21
