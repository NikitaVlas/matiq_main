# MATIQ implementation audit

## Repository state on 2026-08-31

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
- versioned assessment attempts, deterministic reasons, and foundation Roadmap;
- secure playback sessions, immutable heartbeats, and verified watch intervals;
- public Trainer pages, an own-only Trainer cabinet, and content authorship;
- versioned Trainer agreements and manual payout reports with dual control;
- PostgreSQL outbox/inbox, bounded retries, and a Worker dead-letter foundation.

## Partially implemented

### Engineering foundation

Workspace, CI, architecture checks, correlation IDs, structured HTTP completion
logs, and process/database health/readiness endpoints exist. Metrics,
production scraping/dashboards/alerts, the accessibility/visual harness, and an
EU deployment skeleton are not complete. User API, Admin API, and Worker export
provider-neutral metrics; Worker readiness checks PostgreSQL and Redis.

### Shared backend modules

`packages/backend` contains a small set of framework-free policies. Most
application/domain logic still lives in `apps/api` and `apps/admin-api`, so the
target shared-module model is only partially achieved.

### Assessment and Roadmap

Versioned attempts, per-discipline resume, confidence/insufficient-data
semantics, and machine-readable reasons are implemented. Golden expert profiles
and the AI explanation adapter with graceful fallback remain incomplete.

### Video and viewing

Short-lived signed object URLs, preview ranges, playback sessions/watermarks,
immutable heartbeats, interval deduplication, history, progress, and Trainer
analytics exist. Provider processing lifecycle and advanced coordinated-abuse
detection remain incomplete.

### Worker

The BullMQ process uses PostgreSQL outbox/inbox records, stable idempotency keys,
bounded retries, and dead-letter records. Verification/password-reset email is
connected through encrypted outbox events and a provider-neutral adapter.
Production email and reconciliation are not connected. Worker-based GDPR
account-deletion orchestration and local retention jobs are connected;
production processor adapters and backup deletion remain production gates.
Health, PostgreSQL/Redis readiness, and queue/outbox/job lifecycle metrics exist.

### Subscription

Trial and Stripe test-mode foundations exist. Production PSP, EUR price,
VAT/invoices, refund/cancellation policy, grace/reconciliation, and Admin
support cannot be completed before their product and legal gates pass.

## Not implemented

- AI explanation adapter with graceful fallback;
- production processor adapters, backup-deletion verification, and external
  processor coverage for GDPR exports;
- production observability, backup-restore evidence, and launch/security review.

## Current risks and mismatches

- production email, video, AI, and hosting providers are not approved;
- price, VAT, and refunds are not approved; the retention schedule is approved
  as an engineering baseline but requires legal review before production;
- generated OpenAPI route enforcement covers shared frontend transports, and an
  architecture check prevents direct frontend `fetch` calls outside them;
- SPEC-0003 through SPEC-0004 still require status alignment and recorded
  verification evidence;
- database-backed integration and browser E2E require disposable infrastructure
  and remain CI gates.

## Next implementation order

1. Connect production processor adapters, verify active/backup-copy deletion,
   and extend GDPR export to external processors.
2. Add the AI explanation adapter with deterministic graceful fallback after
   the provider boundary is selected.
3. Add production scraping/dashboards/alerts, produce backup-restore evidence,
   and complete launch/security review.
4. Complete production email, payments, VAT/invoices, and reconciliation after
   the provider and legal gates pass.

## Document status

- Status: Active implementation audit
- Owner: MATIQ team
- Last reviewed: 2026-09-02
- Related code: Repository-wide; MVP implementation is partial
