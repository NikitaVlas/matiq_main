# MATIQ Phased Implementation Backlog

## Delivery rules

This backlog defines order; it does not approve production providers, pricing,
tax, or legal retention. Every epic receives an approved feature specification
and acceptance criteria before code. A phase includes negative tests,
observability, and current documentation.

## Phase 0 — Engineering foundation

Set up pnpm/Turborepo; shared TypeScript/lint/format; `web`, `admin-web`, `api`,
`admin-api`, and `worker`; framework-independent backend modules; PostgreSQL,
Redis, and local object storage; Prisma migrations/seed; OpenAPI clients for
both APIs; test harnesses; CI; structured observability; validated configuration
and an EU deployment skeleton.

Exit: verified commands exist, all hosts build, and architecture tests reject
forbidden imports.

## Phase 1 — Identity and Athlete profile

Email/password registration and verification; login/logout and password flows;
sessions and logout-all; full Athlete profile and optional general limitations;
settings; Admin/Editor MFA foundation; permissions/audit foundation; account
export/deletion orchestration.

Exit: an Athlete securely manages the account and cannot access Admin API.

## Phase 2 — Methodology, content, and editorial workflow

Implement the full taxonomy, Trainer profiles, Course/Module/Lesson, revisions
and publication lifecycle, Admin/Editor permissions, Admin-only video upload
record/provider port, topics/relations, Admin UI, and audit log.

Exit: Admin/Editor create a German catalogue; only Admin uploads and publishes.

## Phase 3 — Assessment engine

Versioned bank, options, branching and publication; resumable per-discipline
attempts; weighted signals, confidence and insufficient-data; deterministic 1–5
scoring; expert golden tests; answer editing and Admin preview.

Exit: identical versioned inputs produce the same result without AI.

## Phase 4 — Recommendations and Roadmap

Recommendation rules and dependency order; separate Gi/No-Gi Roadmaps;
machine-readable reasons/versions; add/hide/reorder; independent contexts;
pre-trial preview; balanced Dashboard; graceful operation without AI.

Exit: an explainable editable Roadmap without custom methodology or “mastered”.

## Phase 5 — Video, entitlement, and history

Private provider and processing; 60-second preview; signed playback and
watermark; public preview/lock; immutable heartbeats; interval aggregation and
anti-abuse; resume/history and 80-percent `WATCHED`; scoped analytics.

Exit: no full token without entitlement; redelivery does not increase time.

## Phase 6 — Trial

Eligibility after verified email and assessment; explicit cardless activation;
server-side 7 × 24 hours; library entitlement; reminders; expired locked state;
repeat-trial anti-abuse.

Exit: no payment method, subscription, or automatic renewal is created.

## Phase 7 — Subscription and payments

Gate: provider/DPA, EUR price, VAT/invoices, refunds/cancellation, grace period.
Then implement Product/Price, Checkout, Payment, Subscription, Entitlement;
German disclosures and states; signed idempotent webhooks/reconciliation;
renewal/past-due; cancel/resume/invoices; audited Admin support.

Exit: redirects do not grant access, redelivery is safe, cancellation is clear.

## Phase 8 — Trainer finance

Gate: pool percentage, net revenue, trial weight, minimum payout, retention.
Then versioned agreements/policies; immutable monthly snapshots; paid/trial
split; reproducible allocation; anomaly/adjustment flow; report lifecycle and
separation of duties; own-only reports; manual payment reference and audit.

Exit: closing is idempotent; MATIQ transfers no money automatically.

## Phase 9 — GDPR and production readiness

Data/processor/location inventories; legal notices/consent; retention jobs;
export/delete including processors; backup restore and deletion suppression;
security controls/scanning; completed MFA/re-auth; incident/breach playbook;
recovery objectives; load/accessibility/E2E/security review; Germany checklist.

Exit: production gates are evidenced and residual risks are accepted.

## Post-MVP

Premium-course sales/entitlements and trainer sale share, more disciplines,
physical/mental preparation and nutrition, and stronger DRM/anti-abuse only
where measured risk justifies it.

## Cross-cutting Definition of Done

Approved specification and requirement IDs; migration compatibility; unit and
integration plus critical-flow E2E/negative tests; OpenAPI drift check; German
loading/empty/error/forbidden/expired states; keyboard/focus/responsive checks;
safe logs/metrics/audit; reviewed diff and current Document status.

## Document status

- Status: Approved implementation sequence
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Repository-wide
