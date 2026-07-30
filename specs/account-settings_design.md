# Feature: Account Settings

## Requirements

- While an athlete is authenticated, when the athlete opens Settings, the system shall show only
  that athlete's account state and active sessions.
- While an athlete changes a password, the system shall require the current password, validate the
  new password, revoke old sessions, and keep the new session active.
- While MFA is not enabled, when setup starts, the system shall display the temporary secret and
  accept a valid authenticator code before showing one-time recovery codes.
- While an athlete requests an export, the system shall download a machine-readable JSON file.
- While an athlete requests deletion, the system shall require recent password re-authentication
  and an explicit `DELETE` confirmation before invoking the destructive endpoint.

## Architecture

### Frontend

- Add `/settings` as a client page with account overview, profile entry, sessions, password, MFA,
  export, and deletion sections.
- Use credentials-bound requests, disabled loading states, accessible labels, and explicit success
  and error messages.

### Backend

- Reuse existing authenticated identity endpoints and ownership scoping.
- Extend `/auth/me` with the non-sensitive `mfaEnabled` boolean required to avoid accidental MFA
  re-enrolment.

### Security

- Never expose password hashes, session tokens, encrypted MFA secrets, or recovery-code hashes.
- Account deletion requires server-enforced recent re-authentication plus explicit confirmation.
- Session revocation remains scoped to the authenticated user.
- MFA secrets and recovery codes are rendered only from immediate setup responses.

## Implementation plan

- [x] Expose MFA enabled state safely.
- [x] Build the account settings page and navigation entry.
- [x] Add responsive styling and destructive-action separation.
- [x] Add automated tests for critical account interactions.
- [x] Generate contracts and run required verification.

## Verification

- API and web ESLint, TypeScript, unit tests, and production builds passed.
- Chromium E2E verified session revocation, MFA enrolment, recovery-code display, password
  re-authentication, and explicit deletion confirmation.
- OpenAPI documents and generated contracts were refreshed.

## Document status

- Status: Implemented and verified
- Owner: MATIQ team
- Last reviewed: 2026-07-30
- Related code: `apps/api/src/modules/identity`, `apps/web/src/app/settings`
