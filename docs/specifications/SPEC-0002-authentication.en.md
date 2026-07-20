# SPEC-0002: Authentication and account recovery

## Expected behavior

Athletes can sign in after email verification, request another verification
message, recover a forgotten password, and revoke either the current session or
all sessions. Local development sends German messages through Gmail SMTP when
configured and otherwise uses the console adapter.

## Security

- responses never disclose whether an account exists;
- reset and verification tokens are single-use and stored only as SHA-256 hashes;
- password reset revokes every existing session;
- login and email endpoints are rate-limited per normalized email;
- Gmail credentials exist only in the untracked local `.env`.

## Document status

- Status: Implemented
- Owner: MATIQ team
- Last reviewed: 2026-07-20
- Related code: `apps/api/src/auth*`, `apps/api/src/email.service.ts`, `apps/web/src/app`
