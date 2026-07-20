# Архитектура MATIQ

## Контекст системы

MATIQ — немецкоязычная веб-платформа для BJJ Gi и No-Gi Grappling. Публичный
посетитель видит отобранные материалы и preview. Спортсмен проходит assessment,
получает редактируемую Roadmap и смотрит доступный контент. Admin и Editor
готовят методологию и материалы; Trainer видит только собственную статистику и
отчёты.

## Архитектурный стиль

MATIQ — TypeScript-монорепозиторий. Backend является одним модульным монолитом,
запускаемым через три процесса:

```text
Public/Athlete/Trainer Web ──REST/OpenAPI──▶ User API
Admin/Editor Web ────────────REST/OpenAPI──▶ Admin API
                                               │
                    общие domain/application-модули
                         │              │
                    PostgreSQL     Redis/BullMQ ──▶ Worker
                         │
                      адаптеры провайдеров
```

User API, Admin API и Worker используют общие бизнес-модули. Это независимо
развёртываемые процессы, но не микросервисы и не дублирующие backend-системы.

## Целевая структура монорепозитория

```text
apps/
├── web/         # Next.js public, Athlete и Trainer
├── admin-web/   # Next.js Admin и Editor
├── api/         # NestJS User API
├── admin-api/   # NestJS Admin API
└── worker/      # BullMQ consumers

packages/
├── backend/     # общие domain и application-модули
├── contracts/   # сгенерированные клиенты и публичные схемы
├── ui/          # общие визуальные примитивы
└── config/      # TypeScript, lint, build и runtime configuration
```

В репозитории уже существует ранний vertical slice `apps/web` и `apps/api`.
Остальные процессы и packages создаются по backlog, а не считаются готовыми.

## Ответственность процессов

| Компонент    | Ответственность                                                 | Запрещено                               |
| ------------ | --------------------------------------------------------------- | --------------------------------------- |
| `web`        | Public-каталог, Athlete, assessment, Roadmap, playback, Trainer | Авторитетные бизнес-правила             |
| `admin-web`  | Рабочие процессы Admin и Editor                                 | Выдача доступа через видимость маршрута |
| `api`        | Public, Athlete и Trainer HTTP-контракты                        | Admin controllers                       |
| `admin-api`  | Admin/Editor HTTP-контракты и audit context                     | Копирование domain/application logic    |
| `worker`     | Идемпотентная фоновая обработка                                 | Пользовательский HTTP API               |
| PostgreSQL   | Транзакционные данные продукта                                  | Прямой доступ frontend                  |
| Redis/BullMQ | Очереди и временная координация                                 | Роль источника истины                   |

## Backend-модули

- identity and access;
- athlete profiles;
- methodology and content taxonomy;
- assessment;
- recommendations and Roadmaps;
- trainers, courses and editorial workflow;
- video assets, entitlement and viewing;
- billing, payments and subscriptions;
- trainer agreements, analytics and payout reports;
- notifications;
- administration and audit.

Каждый модуль владеет своими таблицами, repositories, инвариантами и
application services. Другой модуль обращается к ним только через публичный
application-интерфейс владельца или явное событие. Cross-module foreign keys в
одной PostgreSQL допустимы, прямые записи в чужие таблицы — нет.

## Правила зависимостей

- `DR-001`: Controllers — тонкие адаптеры без domain-решений.
- `DR-002`: Domain не импортирует NestJS, Prisma, provider SDK или UI.
- `DR-003`: Application services оркестрируют domain и объявленные ports.
- `DR-004`: Infrastructure adapters реализуют ports и заменяемы.
- `DR-005`: User API, Admin API и Worker используют одни application services.
- `DR-006`: Внешние providers доступны только через внутренние adapters.
- `DR-007`: Frontend использует сгенерированные OpenAPI clients.
- `DR-008`: Queue jobs, webhooks, viewing events и финансовое закрытие
  идемпотентны.
- `DR-009`: Модуль не изменяет таблицы другого модуля напрямую.
- `DR-010`: Несовместимое изменение публичного контракта требует одобрения.

## Границы API

User API публикует public, Athlete и Trainer controllers. Admin API публикует
только Admin и Editor controllers. У Admin API отдельные entry point, origin,
session audience, CORS, rate limits и network/deployment configuration. Оба API
проверяют permissions на сервере. Разделение уменьшает административную
поверхность атаки, но секретность URL не считается защитой.

Источник HTTP-контракта:

```text
NestJS DTO → OpenAPI → generated TypeScript client → Next.js
```

## Worker и асинхронная доставка

API-транзакция сохраняет domain state и outbox record. Dispatcher публикует
job, consumer использует стабильный idempotency key. После ограниченных retry
задача переходит в dead-letter workflow.

Первые обязанности Worker:

- email;
- события video provider;
- агрегация просмотра и anomaly detection;
- AI-объяснения;
- payment reconciliation;
- окончание trial и обслуживание subscription;
- payout reports;
- export и deletion аккаунта.

## PostgreSQL и согласованность

Один PostgreSQL cluster в ЕС и одна migration history обслуживают модульный
монолит. Prisma — начальный data adapter. Cross-module transaction допускается
только в явно рассмотренном use case. Долгие и внешние эффекты используют
outbox/inbox, а не удерживают DB transaction.

Redis восстанавливаем и не хранит единственную копию entitlement, payment,
Roadmap или финансового состояния. Backups и проверка восстановления находятся
в ЕС.

## Внешние интеграции

| Port             | Назначение                          | Поведение при отказе                            |
| ---------------- | ----------------------------------- | ----------------------------------------------- |
| Payment provider | Checkout и subscription             | Проверенный idempotent webhook и reconciliation |
| Video provider   | Private upload и protected playback | Без fallback на публичный original              |
| Email provider   | Транзакционные письма на немецком   | Retry/dead-letter без секретов                  |
| AI provider      | Объяснение deterministic result     | Roadmap доступна без AI                         |

Документ не утверждает конкретного production provider. Международная обработка
требует проверки GDPR, DPA, subprocessors и передачи данных.

## Аутентификация и авторизация

Требуются email/password, подтверждение email, password reset, отзыв sessions и
выход со всех устройств. Social login не входит в MVP. Для Admin и Editor
обязательна MFA. Критические действия требуют недавней re-authentication.
Permissions и resource scope проверяются сервером; Admin-действия создают
неизменяемые audit events.

## Конфигурация, ошибки и наблюдаемость

Runtime configuration валидируется при запуске. Secrets поступают из deployment
environment и не попадают в код, browser bundle, logs или docs. Ошибки имеют
стабильный machine code и безопасное немецкое сообщение. Logs/traces содержат
correlation ID без token и лишних персональных данных. Metrics покрывают HTTP,
queues, DB, entitlement, video, payment, assessment, AI и payout reports.

## Развёртывание и развитие

`web`, `admin-web`, `api`, `admin-api` и `worker` — отдельные deployable units в
инфраструктуре ЕС. DB migrations остаются backward compatible для rolling
deployment. Выделение микросервиса требует доказанной отдельной границы
масштабирования/владения и нового ADR.

## Связанные документы

- [Доменная модель](domain-model.ru.md)
- [Assessment](assessment-model.ru.md)
- [Доступ](access-control.ru.md)
- [Video security](video-security.ru.md)
- [Commerce](commerce.ru.md)
- [Вознаграждение тренеров](trainer-remuneration.ru.md)
- [Privacy и lifecycle](privacy-data-lifecycle.ru.md)

## Document status

- Status: Утверждённая архитектурная основа
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: `apps/web`, `apps/api`, планируемые `apps/admin-web`,
  `apps/admin-api`, `apps/worker` и общие packages
