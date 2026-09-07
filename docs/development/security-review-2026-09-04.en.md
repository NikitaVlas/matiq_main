# Limited browser/GDPR review

## Verified

- 2026-09-07: local `pnpm e2e` passed 13/13. Added registration → email
  verification → athlete profile, retry after a registration 409, one-time GDPR
  export download, and UI recovery after an export network failure.
- The accessibility baseline now covers login and settings at 390 px: `main`, a
  single `h1`, labelled controls, unique `id` values, no horizontal overflow and
  reachable keyboard focus. Corrected heading hierarchy on login, registration,
  check-email, verify-email and profile screens.
- Found and fixed a stuck GDPR export state: fetch failures are announced through
  `role=alert`, and the busy state is always cleared.
- Six Chromium browser scenarios with synthetic APIs: assessment/lesson,
  beginner flow, settings/MFA/deletion, network retry and unavailable status.
- Accessibility baseline: keyboard retry, main/h1, and no horizontal overflow
  at 390 px for deletion status. No full WCAG or contrast audit.
- matiq_test API integration: deletion reauthentication, session revocation,
  wrong/expired/missing secret and completed status without userId/hash.
- Fixed polling (14 requests/minute against a 20/hour limit) and stuck busy state
  on network failure; status now loads initially and on explicit refresh.
- Updated profile/attempt and heartbeat fixtures without removing lesson or
  Roadmap completion assertions.

## Open risks

- Current state: linked audit metadata is scrubbed by a shared ordinary-deletion
  and restore helper, including previously pseudonymised actors. Run
  `256c4923f199a1628b121d51` (31.4 s) no longer reports the metadata leak;
  `deleted_account_subscription_still_active` and `provider_identifiers_remain_linked`
  remain, overall FAILED. `pnpm verify` passed. E2E and other integration suites
  were not rerun. Proposed cancellation design and decisions:
  [SPEC-0017](../specifications/SPEC-0017-deletion-billing.en.md).
  Entries below preserve the history of earlier checks.

- Expanded run `6b7dd26ea4098632354b1e8b` (30.3 s) FAILED at
  `remaining_privacy_review`. Playback sessions, heartbeats and verified intervals
  were erased after both replays; control records were preserved. Synthetic
  email/userId remained in audit metadata; Subscription retained ACTIVE,
  cancelAtPeriodEnd=false and providerCustomerId/providerSubscriptionId.
  This proves local state only, not actual provider charges.
- Financial verification is limited to Subscription and schema inspection:
  TrainerAgreement retains a required trainerId relation to User (Restrict).
  Removing it requires a separate mandatory-retention design. Settlements,
  agreements, payout reports and webhook payloads were not recovery-tested.
- Runtime handlers were not changed in this slice. Agree metadata identifier
  scrubbing and subscription cancellation/provider confirmation before discarding
  provider identifiers; retain mandatory accounting records. The regression is
  intentionally failing and the recovery gate remains open.
- Expanded recovery run `cf804f5a954e09907a76a229` failed at
  `audit_pseudonymisation`: restored audit rows retain the original user ID in
  actor/entityId. Fixed after explicit approval: restore now applies the same
  audit identifier replacement as ordinary deletion, within its transaction.
  Recovery run `fff64e5c488bec9e91ed8668` passed in 32.7 s, including actor-only,
  entity-only, combined references, repeated application and unchanged control
  records. Sessions, verification/reset tokens and viewing history were erased.
- Fixed in the subsequent slice: reapplyDeletionLedger derives receipt retention
  from the completion year, independently of the 35-day tombstone window, and
  preserves existing completion timestamps. Added year-boundary regressions
  and receipt verification in the real recovery drill.
- Recovery drill does not establish complete audit/financial/provider cleanup.
- Mocked E2E do not prove real email, video, payments or full-stack registration.
- Penetration testing, dependency vulnerability scanning, a full WCAG/contrast
  audit and execution of the CI browser job remain outstanding. Synthetic API E2E
  does not replace full-stack email/video/provider verification.

Launch/security gates remain open. The confirmed audit restore defect is fixed.
In the previous slice, `pnpm verify` passed (unchanged packages used the local
cache); browser E2E and other integration suites were not rerun. Audit metadata
scrubbing and irreversible unlinkability across all retained data are not proven.
Graph discovery returned no matching restore function; source was inspected directly.

For the latest test extension, worker lint and typecheck passed (after correcting
TS7022 in the test), as did git diff --check. Full verify, E2E and other integration
suites were not rerun. Graph AuthService line numbers were stale; source was checked.

## Document status

- Status: Partial review; production blockers open
- Owner: MATIQ team
- Last reviewed: 2026-09-07
- Related code: deletion-ledger.ts, AccountDeletionStatusPage.tsx, e2e
