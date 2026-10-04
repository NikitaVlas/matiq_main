# Brevo: local email delivery

## Scope

The user selected Brevo for local verification and password-reset email testing
on 2026-10-04. This extends SPEC-0012; production rollout is not approved.
The adapter reuses templates, encrypted outbox and Worker retries. Public auth
contracts and token expiry remain unchanged. No dependencies are added.

## Setup

1. Verify a Brevo sender and create a regular API key (not SMTP/MCP).
2. Set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS` and
   `EMAIL_FROM_NAME=MATIQ` in the Git-ignored `apps/worker/.env`.
3. Include local `DATABASE_URL` and `REDIS_URL`. If the API uses an explicit
   `EMAIL_ENCRYPTION_KEY`, the Worker must use the same key.
4. Run one Worker with `pnpm --filter @matiq/worker dev` from the root. Stop the
   old console Worker so it cannot consume messages intended for actual delivery.
5. The API's `WEB_URL` must match the local frontend. Open localhost email links
   on that same computer while the application is running.
6. Request a new verification email using the resend form. Events already
   completed by the console adapter are not automatically replayed.

Never put the key in frontend code, source files, screenshots or logs. Adapter
tests replace fetch and do not send real emails.

## Behaviour and limitations

- Fixed HTTPS Brevo endpoint, redirects prohibited, 10-second timeout.
- Errors contain safe codes only, without provider responses or message payloads.
- HTTP 201 with messageId means provider acceptance, not inbox delivery.
- HTTP 401/403: check the key, transactional sending activation and allowed IPs.
- HTTP 429: rate limit; the existing queue performs bounded retries.
- Identical encrypted envelopes produce identical idempotency keys. Brevo's
  protection has a limited time window; exactly-once delivery across arbitrarily
  late retries is not guaranteed. The local inbox also deduplicates completed jobs.
- Console remains the default. Explicit Brevo configuration without a key fails;
  there is no automatic console fallback.
- Production requires an authenticated sender domain, DPA/subprocessor review,
  provider retention review and tracking configuration review. The adapter adds
  no tracking pixels; Brevo account tracking settings must be checked separately.

## References

- [Send API](https://developers.brevo.com/reference/send-transac-email)
- [Idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails)

## Document status

- Status: Verified locally; Brevo reported delivered on 2026-10-04
- Owner: MATIQ team
- Last reviewed: 2026-10-04
- Related code: `apps/worker/src/brevo-email-provider.ts`, `apps/worker/src/email-provider.ts`
