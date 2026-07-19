# MATIQ GDPR, EU Storage, and Data Lifecycle

## Scope and principles

MATIQ follows data minimisation, purpose limitation, accuracy, storage
limitation, confidentiality, and demonstrable accountability. This is an
engineering baseline, not legal advice.

Primary user data, video, logs, analytics, and backups are hosted in the EU. An
international service requires separate approval and review of its DPA,
subprocessors, processing locations, transfer mechanism, and deletion/export
capabilities.

## Data categories

| Category | Examples | Rule |
|---|---|---|
| Account | email, password hash, sessions | Never store passwords; restrict access |
| Athlete profile | discipline, belt, experience, goals | Profile and recommendations only |
| Health limitation | optional general flag | No diagnoses or free medical text |
| Assessment | answers, score, rule version | Versioned and access-restricted |
| Viewing | positions and verified intervals | Minimise raw events and anti-abuse data |
| Commerce | customer/order/payment references | Never store card details |
| Trainer finance | agreements and payout reports | Separate permissions and legal retention |
| Audit/security | actor, action, reason, signals | Minimise and protect from alteration |

Before production, the product owner and counsel document controller identity,
legal bases, privacy notice, processing record, DPIA need, and retention per
category.

## Data-subject rights

The system supports:

- access and machine-readable export;
- correction;
- account deletion;
- restriction or objection where applicable;
- withdrawal of optional consent without affecting necessary lawful processing.

Requests require safe identity verification, an audit trail, and isolation from
other users' data.

## Account deletion

1. The user starts a dedicated destructive flow in the profile.
2. Consequences are shown and recent authentication is required.
3. Sessions are revoked; subscription handling prevents a hidden future charge.
4. The account is blocked and an idempotent deletion job is created.
5. Direct identifiers are erased or irreversibly pseudonymised across product
   modules and processors.
6. Legally retained data is isolated, minimised, and no longer used for product
   purposes.
7. Backups are not selectively rewritten, but deleted data is not restored into
   active service and expires through the backup lifecycle.
8. Completion is confirmed to the user.

Viewing and assessment history must no longer identify the user. Financial and
audit records remain only on a documented legal basis.

## Preliminary retention matrix

| Data | Working rule |
|---|---|
| Used verification/reset tokens | Remove after a short TTL |
| Sessions | Remove on expiry or revocation |
| Raw viewing heartbeats | Short anti-fraud/reconciliation period, then aggregate |
| Viewing aggregates | While needed for account/reporting, then erase or anonymise |
| Assessment versions | Active-account life plus limited audit period |
| Payment/invoice records | German tax and commercial requirements |
| Audit log | Preliminary five years, finalised by legal review |
| Backups | Rolling retention approved before production |

Exact periods are a production gate and must not default to indefinite.

## Security and incident response

- encryption in transit and at rest;
- least privilege, Admin/Editor MFA, and critical-action re-authentication;
- segregated finance, assessment, and security access;
- secret and personal-data redaction in logs;
- processor and data-location inventory;
- breach detection, assessment, and notification procedure;
- regular EU backup-restore testing.

## AI and personal data

AI receives a minimal structured payload without email, health limitations, raw
answers where unnecessary, or unrelated identifiers. A provider may not train
on MATIQ data without separate approval. If AI fails, the deterministic result
remains available without an explanation.

## Production gates

- legally reviewed privacy notice, terms, and processor agreements;
- approved retention schedule;
- implemented export and deletion workflows;
- tested processor and restored-backup deletion behavior;
- DPIA decision;
- incident-response and breach playbook.

## Document status

- Status: Approved engineering baseline; legal review required before production
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Identity, profiles, assessment, analytics, billing, audit
