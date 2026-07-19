# MATIQ Project Constraints

## Technical constraints

- `TC-001`: The project is implemented as a TypeScript monorepo.
- `TC-002`: The frontend uses Next.js and React.
- `TC-003`: The backend uses NestJS as a modular monolith.
- `TC-004`: The primary store is one PostgreSQL database accessed through
  Prisma.
- `TC-005`: Public web-to-API communication uses REST.
- `TC-006`: OpenAPI describes the HTTP contract.
- `TC-007`: A separate worker executes background jobs through Redis and
  BullMQ.
- `TC-008`: pnpm and Turborepo manage the workspace.
- `TC-009`: Local infrastructure shall support Docker Compose.
- `TC-010`: Concrete production providers require separate approval.

## Product constraints

- `PC-001`: The initial market is Germany.
- `PC-002`: German is the primary language of every interface.
- `PC-003`: BJJ Gi and No-Gi Grappling are supported.
- `PC-004`: Only the web platform exists; there is no separate landing page.
- `PC-005`: Native mobile applications are out of scope for the first version.
- `PC-006`: Trainers do not upload or edit content.
- `PC-007`: AI explains results but does not define the methodology.

## Security and privacy constraints

- `SC-001`: Primary user data and backups are stored in the EU.
- `SC-002`: An international external service requires separate approval and a
  review of GDPR, its DPA, and transfers outside the EU.
- `SC-003`: The server enforces authentication and permissions.
- `SC-004`: A source video file is not published as a public resource.
- `SC-005`: Medical diagnoses are not collected in the first version.
- `SC-006`: Secrets and payment data do not appear in client code, logs, or
  documentation.
- `SC-007`: MFA is mandatory for `Admin` and `Editor`.
- `SC-008`: Critical administrative actions require re-authentication.

## Compatibility constraints

- `CC-001`: The first version supports desktop, tablet, and mobile web.
- `CC-002`: Minimum browser versions have not yet been defined.
- `CC-003`: The public API cannot be changed incompatibly without explicit
  approval.

## Time and budget constraints

- No deadline has been defined.
- No infrastructure budget has been defined.

## Prohibited changes

- Microservices without an approved ADR.
- Duplicated business logic between the approved User API and Admin API hosts.
- Direct frontend access to PostgreSQL.
- Business logic inside HTTP controllers.
- Trainer self-publishing.
- Collection of medical diagnoses in the first version.
- Use of an external production service without approval.

## Decisions requiring approval

- A public API change.
- An authentication or authorisation change.
- A new production dependency.
- Selection of a hosting, video, email, AI, or other external provider.
- Payments, refunds, taxes, or Stripe operations.
- Automated trainer payouts.
- Transfer of user data outside the EU.
- A destructive migration or data deletion.
- Deployment or production operations.

## Open questions

- Production hosting and expected budget.
- Supported browsers.
- Performance and availability targets.
- Retention, backup, recovery, and deletion policies.
- Concrete video-protection requirements.

## Document status

- Status: Approved baseline
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Repository-wide
