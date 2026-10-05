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
| Load harness tests   | `pnpm load:test`                            | Local               |
| Local load baseline  | `pnpm load:check`                           | Local Docker        |
| Roadmap skill integration | `node scripts/check-roadmap-skills.mjs` | Local PostgreSQL; build both APIs first |

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

The bounded local load check creates and removes its own `matiq_load_<uuid>`
PostgreSQL database and `matiq-load-<uuid>` Redis queue. It uses the default local
Compose endpoints, compiled API and real DB/queue adapters with synthetic data.
It does not accept remote target URLs or load application `.env` files. See the
[load runbook](load-check.ru.md) for methodology and limits. Evidence is written
under `test-results/load/<uuid>/`. A passing run proves request correctness and
queue drain/deduplication for that run, not production capacity or an approved SLO.

Browser tests use synthetic API responses and run in Chromium via `pnpm e2e`
and `pnpm e2e:admin`. Representative User and Admin states are checked with
axe-core against WCAG 2.1 A/AA, including automated color-contrast rules.
They are not a full-stack production test. The CI browser job runs on Linux;
local Windows execution uses the same cross-platform Playwright configuration.

User Web uses separate Next.js output directories: `.next-dev` for development,
`.next-e2e` for Playwright, and `.next` for production builds. This prevents a
build or browser check from replacing the assets of the running local site.

Real synthetic PostgreSQL dump/restore check:
`pnpm --filter @matiq/worker test:recovery`. See
[recovery runbook](recovery-runbook.ru.md). JSON evidence is written under
`test-results/recovery/` and uploaded by the separate CI recovery job.

Report every command, outcome, skipped check, manual check, and residual risk.

The Roadmap skill check creates and migrates its own local `matiq_skills_<uuid>`
database and removes only that database afterward. It checks editorial hierarchy,
published content matching, persistent athlete selection, HTTP validation, access
isolation and the admin audit record. It does not load application `.env` files.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-09-20
- Related code: Root scripts, CI, all workspace packages
