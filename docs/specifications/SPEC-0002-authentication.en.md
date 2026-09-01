# SPEC-0002: Authentication and account recovery

## Expected behavior

Athletes can sign in after email verification, request another verification
message, recover a forgotten password, and revoke either the current session or
all sessions. The API atomically stores an encrypted email event with the
verification/reset token. The Worker processes the German message through a
provider-neutral adapter; local development uses a non-delivering console adapter.

## Security

- responses never disclose whether an account exists;
- reset and verification token records are single-use and store only SHA-256 hashes;
- password reset revokes every existing session;
- login and email endpoints are rate-limited per normalized email;
- raw tokens and email messages exist in outbox only inside an AES-256-GCM envelope;
- the production encryption key comes only from the deployment environment.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-01
- Related code: `apps/api/src/modules/identity`, `apps/worker`, `packages/backend/src/email`
