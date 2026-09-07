# Launch/security readiness

This checklist is not security certification or production authorization.

- [x] Identity: negative API tests cover own-only sessions/export, Admin/User
  cookie isolation, MFA, reauthentication, and rejection of expired, deleted, or
  unverified privileged sessions. Local 2026-09-07 evidence: User API integration
  6 files/10 tests; Admin API integration 4 files/9 tests.
- [ ] Content: entitlement enforcement, uploads, signed URL expiry and forbidden Admin actions.
- [ ] Billing: signed/replayed webhooks, reconciliation, VAT/refunds after provider approval.
- [ ] Secrets: no known secret signatures were found in tracked files, but
  `pnpm audit --prod --audit-level high` reports 69 vulnerabilities (2 critical,
  32 high); this gate remains open until upgrades and a clean rerun.
- [ ] Browser: registration, assessment, playback and deletion; keyboard, focus,
  mobile, accessibility and network error states. Synthetic Chromium scenarios
  (13/13) cover these flows, including data export; a full WCAG/contrast audit and
  execution of the CI browser job remain required to close the gate.
- [ ] Recovery: synthetic evidence and separate production restore validation,
  independent ledger, EU storage and approved RPO/RTO.
- [ ] Observability: dashboards, alerts, ownership and tested alert delivery.
- [ ] Providers/legal: DPA, subprocessors, export/delete, privacy notice and terms.
- [ ] Incident response: owners, escalation channel and breach procedure.
- [ ] Owner accepts residual risks and authorizes launch.

Next engineering work is Identity/Content negative security coverage,
dependency/security scanning and a full accessibility audit. Unchecked entries
are not completed.

## Document status

Partial verification and open risks:
[2026-09-04 review](security-review-2026-09-04.en.md).

- Status: Active checklist; review not completed
- Owner: MATIQ team
- Last reviewed: 2026-09-07
- Related code: Repository-wide
