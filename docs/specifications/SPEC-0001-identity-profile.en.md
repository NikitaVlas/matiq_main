# SPEC-0001: Registration, email verification, and Athlete profile

## Metadata

- Status: Verified
- Owner: MATIQ team
- Updated: 2026-07-20
- Related requirements: `FR-USER-002`, `FR-ASMT-001`, `FR-ASMT-002`
- Related ADR: ADR-0001, ADR-0002, ADR-0006

## Expected behavior

A user registers with email and a strong password, verifies a short-lived
single-use token, receives an HTTP-only session cookie, and completes the first
German-language athlete profile.

## Security

Email is normalised and unique; passwords use a 12-character complexity policy
and bcrypt; only SHA-256 token hashes are stored; verification expires after 24
hours; cookies are HTTP-only, SameSite=Lax, and Secure in production; profile
routes require a verified session; development tokens are never returned in
production.

## Acceptance criteria

- [x] Registration creates an Athlete and verification token.
- [x] Weak password and duplicate email are rejected.
- [x] Verification creates a session and invalid/expired tokens are rejected.
- [x] Profile persists disciplines, belt, experience, training frequency,
  competition experience, and goals.
- [x] A complete profile receives `completedAt`.
- [x] An integration test covers the full HTTP/PostgreSQL flow.

## Known limitations

Console email is local-development only. Login, password reset, session
management, MFA, and deletion are later Identity slices.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-07-20
- Related code: `apps/api`, `apps/web`, `packages/backend`
