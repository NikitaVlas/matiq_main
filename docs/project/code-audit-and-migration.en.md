# MATIQ Code Audit and Migration Plan

## Audit result

On 2026-07-20 the current Git branch contained documentation, design assets,
and empty task directories, but no applications or workspace configuration.
The `codebase-memory-mcp` index was stale and described earlier `apps/web`,
`apps/api`, and `apps/worker` code that was absent from disk. No working code
was moved or deleted.

## Gap against the approved architecture

The pnpm/Turborepo workspace, five application hosts, shared packages,
PostgreSQL/Redis/object-storage compose, Prisma, two OpenAPI contracts,
generated clients, quality gates, CI, and the first identity/profile vertical
slice were all absent.

## Applied migration

A clean monorepo was created without deleting documentation or design assets.
Shared business policy lives in `packages/backend`, HTTP hosts are separate,
and User API owns the initial Prisma schema. Admin API currently provides only
health/OpenAPI foundation and exposes no Athlete endpoint.

## Data ownership

| Tables | Owner |
|---|---|
| `User`, `Session`, `EmailVerificationToken` | Identity |
| `AthleteProfile` | Athlete Profiles |

Direct cross-module writes are prohibited. Ownership must later be enforced by
architecture tests and module documentation.

## Residual risks

- No production email provider is selected; local delivery is a console adapter.
- Admin authentication and MFA are not implemented yet.
- MinIO is local S3-compatible infrastructure only.
- Full assessment is the next vertical slice.
- The MCP index must be refreshed for the new tree.

## Document status

- Status: Implemented audit baseline
- Owner: MATIQ team
- Last reviewed: 2026-07-20
- Related code: Repository-wide
