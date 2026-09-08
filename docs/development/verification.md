# Verification

## Commands

Run commands from the repository root with pnpm 10.12.1 and Node.js 22+.
On Windows with restricted PowerShell scripts, use `pnpm.cmd`.

| Check                | Command                                     | Required in CI      |
| -------------------- | ------------------------------------------- | ------------------- |
| Setup                | `pnpm install --frozen-lockfile`            | Yes                 |
| Development          | `pnpm dev`                                  | No                  |
| Infrastructure       | `docker compose up -d`                      | Integration only    |
| Prisma client        | `pnpm db:generate`                          | Yes                 |
| Migration            | `pnpm --filter @matiq/api prisma:deploy`    | Integration         |
| OpenAPI documents    | `pnpm openapi:generate`                     | Contract changes    |
| Format               | `pnpm format:check`                         | Yes                 |
| Lint                 | `pnpm lint`                                 | Yes                 |
| Typecheck            | `pnpm typecheck`                            | Yes                 |
| Unit tests           | `pnpm test`                                 | Yes                 |
| Browser E2E          | `pnpm e2e`                                  | Critical flows      |
| Admin browser E2E    | `pnpm e2e:admin`                            | Critical admin flow |
| Identity integration | `pnpm --filter @matiq/api test:integration` | Yes with PostgreSQL |
| Build                | `pnpm build`                                | Yes                 |
| Full verification    | `pnpm verify`                               | Yes                 |

Для проверки восстановления после удаления экспортируйте ledger перед backup,
восстановите disposable test database и примените ledger командами из
`docs/architecture/privacy-data-lifecycle.ru.md`. Worker integration test
автоматически воспроизводит возврат удалённого профиля из backup и проверяет его
повторное удаление.

`DATABASE_URL` must point to a disposable test/local PostgreSQL for migration
and integration tests. Never run these commands against production.

## Required by change type

| Change               | Required checks                                      |
| -------------------- | ---------------------------------------------------- |
| Documentation        | Link check and `git diff --check`                    |
| Business policy      | Format, lint, typecheck, unit, build                 |
| Prisma/data access   | Standard checks, migration, integration              |
| API/OpenAPI          | Standard checks, generated-client drift, integration |
| Critical user flow   | Standard checks and `pnpm e2e`/integration           |
| Permissions/security | Integration, negative cases, security review         |

## Reporting

Browser tests use synthetic API responses and run in Chromium via `pnpm e2e`
and `pnpm e2e:admin`. Representative User and Admin states are checked with
axe-core against WCAG 2.1 A/AA, including automated color-contrast rules.
They are not a full-stack production test. The CI browser job runs on Linux;
local Windows execution uses the same cross-platform Playwright configuration.

Real synthetic PostgreSQL dump/restore check:
`pnpm --filter @matiq/worker test:recovery`. See
[recovery runbook](recovery-runbook.ru.md). JSON evidence is written under
`test-results/recovery/` and uploaded by the separate CI recovery job.

Report every command, outcome, skipped check, manual check, and residual risk.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-09-03
- Related code: Root scripts, CI, all workspace packages
