# Аудит реализации MATIQ

## Состояние репозитория на 2026-08-31

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
- versioned assessment attempts, детерминированные reasons и foundation Roadmap;
- защищённые playback sessions, immutable heartbeats и verified watch intervals;
- публичные страницы тренеров, own-only Trainer cabinet и авторство контента;
- версионируемые договоры тренеров и ручные payout reports с dual control;
- PostgreSQL outbox/inbox, bounded retry и dead-letter foundation для Worker.

## Частично реализовано

### Инженерная основа

Реализованы workspace/CI/architecture checks, correlation IDs, structured HTTP
completion logs и process/database health/readiness endpoints. Не завершены
production scraping/dashboards/alerts, accessibility/visual harness и EU
deployment skeleton. User API, Admin API и Worker экспортируют provider-neutral
метрики; Worker readiness проверяет PostgreSQL и Redis.

### Общие backend-модули

`packages/backend` содержит только небольшой набор framework-free policies.
Основная application/domain логика пока остаётся в `apps/api` и
`apps/admin-api`; целевая модель общих модулей достигнута частично.

### Assessment и Roadmap

Versioned attempts, per-discipline resume, confidence/insufficient-data и
machine-readable reasons реализованы. Golden expert profiles и AI explanation
adapter с graceful fallback ещё не завершены.

### Video и просмотр

Есть short-lived signed object URL, preview range, playback sessions/watermark,
immutable heartbeats, interval deduplication, history, progress и Trainer
analytics. Не завершены provider processing lifecycle и расширенная anomaly
detection против координированной накрутки.

### Worker

BullMQ process использует PostgreSQL outbox/inbox, стабильные idempotency keys,
ограниченные retry и dead-letter записи. Verification/password-reset email job
подключён через зашифрованный outbox и provider-neutral adapter. Production
email provider, reconciliation, GDPR и retention jobs ещё не подключены.
Добавлены health, PostgreSQL/Redis readiness и метрики queue/outbox/job lifecycle.

### Subscription

Trial и Stripe test-mode foundation существуют. Production PSP, EUR price,
VAT/invoices, refund/cancellation policy, grace/reconciliation и Admin support
не могут считаться завершёнными до прохождения продуктового и юридического gate.

## Не реализовано

- AI explanation adapter с graceful fallback;
- processor-wide GDPR deletion/export orchestration и retention jobs;
- production observability, backup-restore evidence и launch/security review.

## Текущие риски и расхождения

- production email, video, AI и hosting providers не утверждены;
- цена, VAT, refunds и юридический retention schedule не утверждены;
- generated OpenAPI route enforcement действует в shared frontend transports,
  а architecture check запрещает прямые frontend `fetch` calls вне них;
- SPEC-0003 — SPEC-0004 всё ещё требуют выравнивания статуса и verification
  evidence;
- database-backed integration и browser E2E требуют disposable infrastructure
  и остаются CI gates.

## Следующий порядок реализации

1. Реализовать processor-wide GDPR deletion/export orchestration после
   утверждения retention policy.
2. Добавить AI explanation adapter с deterministic graceful fallback после
   выбора provider boundary.
3. Подготовить production scraping/dashboards/alerts, backup-restore evidence и
   launch/security review.
4. После утверждения provider/legal gates завершить production email, payments,
   VAT/invoices и reconciliation.

## Document status

- Status: Active implementation audit
- Owner: Команда MATIQ
- Last reviewed: 2026-08-31
- Related code: Repository-wide; реализация MVP частичная
