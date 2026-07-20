# SPEC-0003: Local administration and content operations

The local Admin API is isolated from User API and is protected by an
`x-admin-key` header. It exposes dashboard statistics, trainer listing, video
listing, and administrator-only video registration. Content remains unpublished
until an administrator explicitly sets `published`.

## Document status

- Status: Implemented locally
- Owner: MATIQ team
- Last reviewed: 2026-07-20
- Related code: `apps/admin-api`, `apps/admin-web`
