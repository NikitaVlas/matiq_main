# Аудит кода и план миграции MATIQ

## Результат аудита

На 2026-07-20 текущая Git-ветка содержала документацию, design-артефакты и
пустые task directories, но не содержала приложений или workspace
configuration. Индекс `codebase-memory-mcp` был устаревшим: он описывал более
ранний код `apps/web`, `apps/api` и `apps/worker`, отсутствовавший на диске.
Поэтому перенос или удаление рабочего кода не выполнялись.

## Расхождение с утверждённой архитектурой

До реализации отсутствовали:

- pnpm/Turborepo workspace;
- `apps/web`, `apps/admin-web`, `apps/api`, `apps/admin-api`, `apps/worker`;
- общие backend/contracts/config packages;
- PostgreSQL/Redis/object-storage compose;
- Prisma schema и migration;
- два OpenAPI-документа и generated clients;
- lint/typecheck/test/build/verify и CI;
- vertical slice регистрации, email verification и Athlete profile.

## Выполненная миграция

Создан чистый monorepo без удаления существующих документов и design assets.
Общая бизнес-логика размещена в `packages/backend`, HTTP hosts отделены друг от
друга, а User API является владельцем первой Prisma schema. Admin API пока
содержит только health/OpenAPI foundation и не принимает Athlete endpoints.

## Владение данными

Начальная Prisma schema физически находится в `apps/api/prisma`, но таблицы
помечаются логическим владельцем:

| Таблицы | Владелец |
|---|---|
| `User`, `Session`, `EmailVerificationToken` | Identity |
| `AthleteProfile` | Athlete Profiles |

Прямые cross-module writes запрещены. При росте schema ownership должен
проверяться architecture tests и module documentation.

## Остаточные риски

- Production email provider не выбран; локально используется console adapter.
- Admin authentication/MFA ещё не реализованы.
- MinIO используется только как локальный S3-compatible service.
- Полный assessment начинается следующим vertical slice.
- Индекс MCP необходимо обновить после фиксации нового дерева.

## Document status

- Status: Implemented audit baseline
- Owner: Команда MATIQ
- Last reviewed: 2026-07-20
- Related code: Repository-wide
