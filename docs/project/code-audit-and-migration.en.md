# MATIQ implementation audit

## Repository state on 2026-08-23

The repository contains a working TypeScript monorepo with five processes:
`web`, `admin-web`, `api`, `admin-api`, and `worker`. It includes a Prisma schema
and migrations, local PostgreSQL/Redis/S3-compatible infrastructure, two
OpenAPI contracts, generated TypeScript types, CI, and unit, integration, and
browser E2E tests.

The `codebase-memory-mcp` project `matiq-main-current` represents the main
applications and is used for discovery and impact analysis. Conclusions are
also checked against source because the index may lag behind uncommitted work.

## Implemented vertical slices

- registration, email verification, login/logout, and password recovery;
- session management, password change, re-authentication, export, and deletion;
- Admin/Editor TOTP MFA and recovery codes, roles, and audit foundation;
- Athlete profile, assessment, deterministic recommendations, and Roadmap;
- beginner foundation Roadmap, course/lesson navigation, and progress;
- public catalog, courses, video, history, settings, and subscription UI;
- Admin UI/API for assessment, Roadmap metadata, content, courses, and videos;
- local S3-compatible upload/playback adapter and preview metadata;
- trial and basic Stripe checkout/webhook/cancellation flow;
- OpenAPI generation and frontend route types derived from generated contracts.

## Partially implemented

### Engineering foundation

Workspace, CI, architecture checks, correlation IDs, structured HTTP completion
logs, and process/database health/readiness endpoints exist. Metrics,
accessibility/visual harness, external dependency probes beyond PostgreSQL, and
an EU deployment skeleton are not complete.

### Shared backend modules

`packages/backend` contains a small set of framework-free policies. Most
application/domain logic still lives in `apps/api` and `apps/admin-api`, so the
target shared-module model is only partially achieved.

### Assessment and Roadmap

The working flow exists, but the backlog still requires versioned attempts and
question banks, complete per-discipline resume, confidence/insufficient-data
semantics, golden expert profiles, and machine-readable versions and reasons.

### Video and viewing

Short-lived signed object URLs, preview ranges, history, and progress exist.
Provider processing lifecycle, playback sessions/watermarks, immutable
heartbeats, interval aggregation/deduplication, anti-abuse, and Trainer
analytics do not.

### Worker

The BullMQ process runs as a generic consumer. Outbox/inbox, domain-specific
jobs, retries/dead-letter handling, and lifecycle jobs are not implemented.

### Subscription

Trial and Stripe test-mode foundations exist. Production PSP, EUR price,
VAT/invoices, refund/cancellation policy, grace/reconciliation, and Admin
support cannot be completed before their product and legal gates pass.

## Not implemented

- complete public Trainer profiles and an own-only Trainer cabinet;
- verified viewing time, Trainer agreements, and payout reports;
- AI explanation adapter with graceful fallback;
- processor-wide GDPR deletion/export orchestration and retention jobs;
- production observability, backup-restore evidence, and launch/security review.

## Current risks and mismatches

- production email, video, AI, and hosting providers are not approved;
- price, VAT, refunds, and the legal retention schedule are not approved;
- generated OpenAPI route enforcement covers shared frontend transports, and an
  architecture check prevents direct frontend `fetch` calls outside them;
- some specifications say `Implemented` without recorded full verification;
- the full local `pnpm verify` passed on 2026-08-23; database-backed integration
  and browser E2E still require their disposable infrastructure and remain CI
  gates.

## Next implementation order

1. Close fully specified Identity/Profile and Assessment gaps.
2. Add metrics and the remaining provider-neutral observability checks.
3. Complete deterministic Roadmap versioning and explainability.
4. Build the provider-neutral video entitlement and viewing-event model.
5. Build the Worker outbox/idempotency foundation.
6. Add Trainer analytics/reporting without automated payouts.
7. Complete payments and production/GDPR after provider and legal gates pass.

## Document status

- Status: Active implementation audit
- Owner: MATIQ team
- Last reviewed: 2026-08-23
- Related code: Repository-wide; MVP implementation is partial
