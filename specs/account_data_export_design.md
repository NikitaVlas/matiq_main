# Account data export design

## Document status

- Status: Implemented / Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-07

## Requirements (EARS)

- When an authenticated user has reauthenticated within 15 minutes, the system shall accept a data-export request for that user only.
- When a request is accepted, the API shall enqueue background generation and return a request identifier plus a one-time download secret.
- When the Worker handles the request, it shall create a versioned, machine-readable JSON document from an explicit allowlist and encrypt it at rest.
- While the export is ready and no more than seven days old, its owner shall be able to download it once using an authenticated session and the one-time secret.
- When the first download succeeds, the system shall immediately purge the encrypted payload and mark the request downloaded.
- When an export expires, retention shall purge its payload and mark it expired.
- The export shall not contain password or token hashes, MFA secrets, internal anti-abuse data, raw audit metadata, or another user's data.
- The legacy synchronous `GET /auth/account/export` contract shall remain available during this compatible migration.

## Components and data flow

1. User Web reauthenticates and calls `POST /auth/account/exports`.
2. User API creates `AccountExportRequest` and an outbox event atomically.
3. Worker builds the allowlisted document and stores only AES-256-GCM ciphertext.
4. User Web polls the owner-scoped status endpoint.
5. User Web posts the one-time secret to the download endpoint; User API atomically consumes it and returns JSON with `no-store` headers.
6. Retention expires and purges undownloaded exports after seven days.

## Security decisions

- The download secret is generated with 256 bits of entropy and only its SHA-256 hash is stored.
- The export encryption key comes from `ACCOUNT_EXPORT_ENCRYPTION_KEY`, encoded as 32-byte base64, and is never persisted.
- Secrets are sent in request bodies rather than URLs to avoid browser history and referrer leakage.
- Status and download queries always include both request ID and authenticated owner ID.
- Audit entries record lifecycle actions without export contents or download secrets.
