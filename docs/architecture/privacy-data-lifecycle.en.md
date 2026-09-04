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

| Category          | Examples                            | Rule                                     |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| Account           | email, password hash, sessions      | Never store passwords; restrict access   |
| Athlete profile   | discipline, belt, experience, goals | Profile and recommendations only         |
| Health limitation | optional general flag               | No diagnoses or free medical text        |
| Assessment        | answers, score, rule version        | Versioned and access-restricted          |
| Viewing           | positions and verified intervals    | Minimise raw events and anti-abuse data  |
| Commerce          | customer/order/payment references   | Never store card details                 |
| Trainer finance   | agreements and payout reports       | Separate permissions and legal retention |
| Audit/security    | actor, action, reason, signals      | Minimise and protect from alteration     |

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

For a paid period, the approved choice disables renewal immediately, preserves
paid access and schedules deletion at period end. Until then the user may cancel
deletion without automatically enabling renewal. The account is not yet erased.
A separate “Delete now” choice does not wait for paid access to expire. Final
deletion is irreversible. Ordinary cancellation does not automatically issue a
refund; statutory refund/withdrawal rights remain unaffected.
See [SPEC-0017](../specifications/SPEC-0017-deletion-billing.en.md).
Scheduled deletion is not implemented; current code blocks immediately.

The following steps and erasure deadlines apply when final deletion starts,
not when voluntarily scheduling deletion for a future date:

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

## Approved retention matrix

The periods below are the approved engineering baseline. They do not permit
indefinite retention and require confirmation by German counsel or a data
protection officer before production.

| Data | Retention | End-of-period action |
| --- | --- | --- |
| Account, profile, assessment, and Roadmap | Active-account lifetime | Block immediately after a confirmed request; erase or irreversibly pseudonymise product data within 30 days |
| Viewing history and progress | Active-account lifetime | Erase within 30 days after confirmed account deletion |
| Playback sessions and raw heartbeats | 90 days from creation | Irreversibly erase |
| Verified watch intervals | 180 days after the accounting month closes | Erase viewer-level records; retain only an anonymised monthly aggregate |
| Auth events and security logs | 90 days | Erase unless covered by a documented incident/legal hold |
| Technical application logs | 30 days | Irreversibly erase |
| Admin audit log | 5 years | Erase; if the subject account is deleted earlier, irreversibly replace its identifiers while retaining the minimum evidentiary event |
| Evidence that a GDPR request was completed | 3 years from the end of the completion calendar year | Erase; during retention keep only request ID, dates, status, and processed systems without email, name, or original user ID |
| Used/expired verification and reset tokens | Until use or expiry plus 7 days | Erase the record and token hash |
| Expired or revoked sessions | No more than 24 hours after expiry/revocation | Erase |
| Successful Outbox | Encrypted payload: 24 hours after processing; safe technical metadata: 30 days | Purge payload first, then erase the record |
| Completed Inbox | 30 days | Erase |
| Dead letter | 30 days; no more than 90 days while an investigation remains open | Erase after closure or the maximum period; never copy the payload |
| Accounting vouchers: invoices, refunds, chargebacks, payout reports | 8 years from the end of the relevant calendar year | Erase after the mandatory period unless covered by a legal hold |
| Books, annual accounts, and related records | 10 years from the end of the relevant calendar year | Erase after the mandatory period unless covered by a legal hold |
| Commercial correspondence and trainer agreements | 6 years from the end of the year in which the agreement ended or the document was received/sent | Erase unless a longer category applies to a particular financial document |
| MATIQ backups | Rolling 35-day window | Expire through rotation; after restore, reapply the deletion ledger before ordinary processing resumes |
| Active processor/provider copies | No more than 30 days after the deletion command | Obtain confirmation or record an exception and escalation |
| Processor/provider backup copies | No more than 90 days | Require this in the DPA/contract and verify it before onboarding |

Unless a calendar-year rule is stated, a period runs from the triggering event
through the end of the applicable day. Retention jobs must be idempotent,
auditable, and must not copy erased payloads into logs.

## Erasure, pseudonymisation, and legal holds

Direct identifiers, credentials/MFA data, assessment answers, personal Roadmaps,
viewing history, playback records, auth tokens, and completed delivery payloads
are irreversibly erased. A plain hash of a predictable user ID is not considered
irreversible pseudonymisation.

Only records supported by a separate documented basis are pseudonymised: audit
events, anonymised viewing aggregates, and finance totals without viewer data.
Mandatory accounting records retain only legally required attributes, remain
segregated from the product profile, and are unavailable to product analytics.

A legal hold pauses deletion only for a specific category and period. It needs a
documented basis, owner, expiry date, and review at least every 90 days. An
indefinite whole-account hold is prohibited.

## External provider requirements

MATIQ sends a deletion command to each processor/provider no later than 24 hours
after the corresponding local deletion phase starts. A new provider may be
onboarded only when its contract or DPA requires active-copy deletion within 30
days, backup-copy deletion within 90 days, assistance with data-subject requests,
a subprocessor list, and verifiable deletion confirmation. A longer period is a
production blocker requiring a documented legal decision.

## Legal basis references

- [GDPR Articles 5 and 17](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679):
  data minimisation, storage limitation, erasure rights, and lawful exceptions.
- [HGB section 257](https://www.gesetze-im-internet.de/hgb/__257.html) and
  [AO section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html): ten years for books/annual accounts, eight
  years for accounting vouchers, and six years for commercial correspondence.
- [BGB section 195](https://www.gesetze-im-internet.de/bgb/__195.html) and
  [section 199](https://www.gesetze-im-internet.de/bgb/__199.html): the general
  three-year limitation period and its commencement rule.

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
- legal confirmation of the approved engineering retention schedule;
- implemented export and deletion workflows;
- tested processor and restored-backup deletion behavior;
- DPIA decision;
- incident-response and breach playbook.

## Document status

- Status: Approved engineering baseline; legal review required before production
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: Identity, profiles, assessment, analytics, billing, audit
