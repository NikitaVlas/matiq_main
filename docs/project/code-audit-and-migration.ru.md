# Аудит реализации MATIQ

## Состояние репозитория на 2026-08-23

Репозиторий содержит рабочий TypeScript-монорепозиторий с пятью процессами:
`web`, `admin-web`, `api`, `admin-api` и `worker`. Присутствуют Prisma schema и
миграции, локальная PostgreSQL/Redis/S3-compatible инфраструктура, два
OpenAPI-контракта, generated TypeScript types, CI и набор unit, integration и
browser E2E tests.

Индекс `codebase-memory-mcp` `matiq-main-current` отражает текущие основные
приложения и используется для impact/discovery. Выводы о контрактах и
реализации дополнительно проверяются по исходникам, поскольку индекс может
отставать от незакоммиченных изменений.

## Реализованные вертикальные срезы

- регистрация, подтверждение email, login/logout и восстановление пароля;
- управление sessions, смена пароля, re-authentication, export и account deletion;
- TOTP MFA и recovery codes для Admin/Editor, роли и audit foundation;
- Athlete profile, assessment, детерминированные рекомендации и Roadmap;
- beginner foundation Roadmap, course/lesson navigation и progress;
- публичный каталог, курсы, видео, history, settings и subscription UI;
- Admin UI/API для assessment, roadmap metadata, content, courses и video records;
- локальный S3-compatible upload/playback adapter и preview metadata;
- trial и базовый Stripe checkout/webhook/cancellation flow;
- OpenAPI generation и frontend route types, выводимые из generated contracts.

## Частично реализовано

### Инженерная основа

Реализованы workspace/CI/architecture checks, correlation IDs, structured HTTP
completion logs и process/database health/readiness endpoints. Не завершены
metrics, accessibility/visual harness, проверки внешних зависимостей помимо
PostgreSQL и EU deployment skeleton.

### Общие backend-модули

`packages/backend` содержит только небольшой набор framework-free policies.
Основная application/domain логика пока остаётся в `apps/api` и
`apps/admin-api`; целевая модель общих модулей достигнута частично.

### Assessment и Roadmap

Рабочий flow реализован, но backlog ещё требует versioned attempts/question
bank, полного per-discipline resume, confidence/insufficient-data semantics,
golden expert profiles и формализованных machine-readable versions/reasons.

### Video и просмотр

Есть short-lived signed object URL, preview range, history и progress. Нет
provider processing lifecycle, playback sessions/watermark, immutable
heartbeats, interval aggregation/deduplication, anti-abuse и Trainer analytics.

### Worker

BullMQ process запускается, но пока является generic consumer. Outbox/inbox,
domain-specific jobs, retries/dead-letter workflow и фоновые lifecycle jobs не
реализованы.

### Subscription

Trial и Stripe test-mode foundation существуют. Production PSP, EUR price,
VAT/invoices, refund/cancellation policy, grace/reconciliation и Admin support
не могут считаться завершёнными до прохождения продуктового и юридического gate.

## Не реализовано

- полноценный публичный Trainer profile и own-only Trainer cabinet;
- verified viewing time, trainer agreements и payout reports;
- AI explanation adapter с graceful fallback;
- processor-wide GDPR deletion/export orchestration и retention jobs;
- production observability, backup-restore evidence и launch/security review.

## Текущие риски и расхождения

- production email, video, AI и hosting providers не утверждены;
- цена, VAT, refunds и юридический retention schedule не утверждены;
- generated OpenAPI route enforcement действует в shared frontend transports,
  а architecture check запрещает прямые frontend `fetch` calls вне них;
- часть спецификаций имеет статус `Implemented`, хотя полная required
  verification не зафиксирована;
- полный локальный `pnpm verify` прошёл 2026-08-23; database-backed integration
  и browser E2E требуют disposable infrastructure и остаются CI gates.

## Следующий порядок реализации

1. Закрыть полностью определённые gaps Identity/Profile и Assessment.
2. Добавить metrics и оставшиеся provider-neutral observability checks.
3. Довести deterministic Roadmap versioning/explainability.
4. Реализовать provider-neutral video entitlement и viewing event model.
5. Реализовать Worker outbox/idempotency foundation.
6. Добавить Trainer analytics/reporting без автоматических выплат.
7. После утверждения provider/legal gates завершить payments и production/GDPR.

## Document status

- Status: Active implementation audit
- Owner: Команда MATIQ
- Last reviewed: 2026-08-23
- Related code: Repository-wide; реализация MVP частичная
