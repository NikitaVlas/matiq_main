# MATIQ Architecture

## System context

MATIQ is a German-language web platform for BJJ Gi and No-Gi Grappling. Public
visitors browse curated metadata and previews. Athletes complete an assessment,
receive an editable Roadmap, and watch entitled content. Admins and Editors
prepare content and methodology; Trainers see only their own statistics and
reports.

## Architectural style

MATIQ is a TypeScript monorepo. The backend is one modular monolith exposed
through three process hosts:

```text
Public/Athlete/Trainer Web ──REST/OpenAPI──▶ User API
Admin/Editor Web ────────────REST/OpenAPI──▶ Admin API
                                               │
                  shared domain/application modules
                         │              │
                    PostgreSQL     Redis/BullMQ ──▶ Worker
                         │
                 external-service adapters
```

User API, Admin API, and Worker share business modules. They are independently
deployable processes, not microservices and not duplicated backends.

## Target monorepo structure

```text
apps/
├── web/         # Next.js public, Athlete, and Trainer areas
├── admin-web/   # Next.js Admin and Editor area
├── api/         # NestJS User API
├── admin-api/   # NestJS Admin API
└── worker/      # BullMQ consumers

packages/
├── backend/     # shared domain and application modules
├── contracts/   # generated clients and public schemas
├── ui/          # shared visual primitives
└── config/      # TypeScript, lint, build, and runtime configuration
```

The existing repository contains an early `apps/web` and `apps/api` vertical
slice. Missing hosts and packages are introduced through the backlog, not
assumed to exist.

## Runtime responsibilities

| Component | Responsibility | Must not |
|---|---|---|
| `web` | Public catalogue, athlete account, assessment, Roadmap, playback, Trainer area | Contain authoritative business rules |
| `admin-web` | Admin and Editor workflows | Grant access through route visibility |
| `api` | Public, Athlete, and Trainer HTTP contracts | Expose Admin controllers |
| `admin-api` | Admin and Editor HTTP contracts and audit context | Duplicate domain/application logic |
| `worker` | Idempotent async processing and aggregation | Expose a user-facing API |
| PostgreSQL | Transactional product data | Become directly accessible to frontend |
| Redis/BullMQ | Queues and disposable coordination state | Become a source of truth |

## Backend modules

- identity and access;
- athlete profiles;
- methodology and content taxonomy;
- assessment;
- recommendations and Roadmaps;
- trainers, courses, and editorial workflow;
- video assets, entitlement, and viewing;
- billing, payments, and subscriptions;
- trainer agreements, analytics, and payout reports;
- notifications;
- administration and audit.

Each module owns its tables, repositories, invariants, and application services.
Another module may read or mutate them only through the owner's public
application interface or an explicit event. Cross-module foreign keys are
allowed in one PostgreSQL database, but direct cross-module writes are not.

## Dependency rules

- `DR-001`: Controllers are thin adapters and contain no domain decisions.
- `DR-002`: Domain code does not import NestJS, Prisma, provider SDKs, or UI.
- `DR-003`: Application services orchestrate domain objects and declared ports.
- `DR-004`: Infrastructure adapters implement ports and are replaceable.
- `DR-005`: User API, Admin API, and Worker reuse the same application services.
- `DR-006`: External providers are reachable only through internal adapters.
- `DR-007`: Frontends use generated OpenAPI clients and never access storage.
- `DR-008`: Queue jobs, webhooks, viewing events, and financial closing are
  idempotent.
- `DR-009`: A module does not write another module's tables directly.
- `DR-010`: A public contract change requires explicit approval and
  compatibility review.

## API boundaries

User API exposes public, Athlete, and Trainer controllers. Admin API exposes
Admin and Editor controllers only. Admin API has a separate entry point, origin,
session audience, CORS policy, rate limits, and deployment/network
configuration. Both APIs perform server-side permission checks. Separate hosts
reduce administrative attack surface but do not make URL secrecy a control.

NestJS DTOs and OpenAPI are the HTTP contract source:

```text
NestJS DTO → OpenAPI → generated TypeScript client → Next.js
```

## Worker and asynchronous delivery

API transactions store both domain state and an outbox record. A dispatcher
publishes jobs; consumers use stable idempotency keys. Failed jobs retry with
bounded backoff and enter a dead-letter workflow after the configured limit.

Initial Worker responsibilities:

- email delivery;
- video-provider event processing;
- viewing aggregation and anomaly detection;
- AI explanation generation;
- payment event reconciliation;
- trial expiry and subscription maintenance;
- trainer payout-report generation;
- account export and deletion.

## PostgreSQL and consistency

One EU-hosted PostgreSQL cluster and one migration history serve the modular
monolith. Prisma is the initial data adapter. A transaction may span modules
only through an explicitly reviewed application use case. Long-running and
external side effects use outbox/inbox patterns rather than holding a database
transaction.

Redis is rebuildable and stores no sole copy of entitlement, payment, Roadmap,
or financial state. Backups and tested restoration stay in the EU.

## External integrations

| Port | Purpose | Failure policy |
|---|---|---|
| Payment provider | Checkout and subscriptions | Verified idempotent webhooks plus reconciliation |
| Video provider | Private upload and protected playback | No fallback to public originals |
| Email provider | Transactional German email | Retry and dead-letter; no secret data |
| AI provider | Explanation of deterministic results | Roadmap remains usable without AI |

No concrete production provider is approved by this document. International
processing requires GDPR, DPA, subprocessor, and transfer review.

## Authentication and authorisation

Email/password, verified email, password reset, session revocation, and logout
from all devices are required. Social login is out of scope. `Admin` and
`Editor` require MFA. Critical actions require recent re-authentication.
Permissions and resource scope are checked on the server; Admin actions create
immutable audit events.

## Configuration, errors, and observability

Runtime configuration is schema-validated at startup. Secrets come from the
deployment environment and never enter code, browser bundles, logs, or docs.
Errors use stable machine codes and safe German user messages. Logs and traces
carry correlation IDs without tokens or unnecessary personal data. Metrics
cover HTTP, queues, database, entitlement, video, payment, assessment, AI, and
financial-report health.

## Deployment and evolution

`web`, `admin-web`, `api`, `admin-api`, and `worker` are separate deployables in
EU infrastructure. Database migrations remain backward compatible across a
rolling deployment. A microservice extraction requires evidence of an
independent scaling/ownership boundary and a new ADR.

## Related documents

- [Domain model](domain-model.en.md)
- [Assessment model](assessment-model.en.md)
- [Access control](access-control.en.md)
- [Video security](video-security.en.md)
- [Commerce](commerce.en.md)
- [Trainer remuneration](trainer-remuneration.en.md)
- [Privacy and data lifecycle](privacy-data-lifecycle.en.md)

## Document status

- Status: Approved architecture baseline
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: `apps/web`, `apps/api`, planned `apps/admin-web`,
  `apps/admin-api`, `apps/worker`, and shared packages
