# SPEC-0004: Phase 1 account lifecycle and administrative security

## Metadata

- Status: In Progress
- Owner: MATIQ team
- Updated: 2026-07-23
- Related requirements: `FR-USER-002`, `FR-USER-003`, `NFR-SEC-001`, `NFR-SEC-002`, `NFR-SEC-007`, `NFR-SEC-008`, `NFR-PRIV-006`, `NFR-PRIV-007`
- Related architecture: access control, privacy and data lifecycle

## Approved decisions

- `Admin` and `Editor` use RFC 6238 TOTP MFA and receive ten single-use recovery codes.
- A critical action requires password re-authentication completed within 15 minutes.
- The first `Admin` is created by a local CLI only; no bootstrap or role-assignment HTTP endpoint is public.
- Account deletion immediately revokes sessions and blocks access, then runs as an idempotent deletion workflow.
- Direct identifiers and profile data are erased or irreversibly pseudonymised. Audit and financial records are retained only when a documented legal basis requires them.

## Acceptance criteria

- [ ] Authenticated users can list and revoke their own sessions, change password, export account data, and start account deletion.
- [ ] An account-deletion request requires a re-authentication no older than 15 minutes and revokes all sessions.
- [ ] General limitations are structured optional flags, never diagnoses or free medical text, and include a German non-medical notice.
- [ ] Admin and Editor login requires configured TOTP MFA; recovery codes are one-time and stored only as hashes.
- [ ] Admin API authorises a verified Admin or Editor session on the server and checks explicit permissions.
- [ ] Role changes, MFA changes, export, deletion, and critical Admin actions create immutable audit events.
- [ ] The local CLI can create exactly one explicitly requested verified Admin account.
- [ ] Unit and PostgreSQL integration tests cover positive, negative, and critical security cases.

## Known limitations

- The final legal retention schedule, processor deletion contracts, and production MFA recovery policy require legal review before production.

## Document status

- Status: In Progress
- Owner: MATIQ team
- Last reviewed: 2026-07-23
- Related code: `apps/api`, `apps/admin-api`, `apps/web`, `apps/admin-web`
