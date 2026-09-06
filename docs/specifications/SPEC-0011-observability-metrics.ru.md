# SPEC-0011: Provider-neutral метрики и Worker readiness

## Контекст

HTTP APIs уже имеют correlation ID, безопасные completion logs и PostgreSQL
health/readiness. Worker имеет структурированные события, но не предоставляет
health/readiness и машиночитаемые метрики.

## Scope

- Prometheus-compatible текстовые метрики без внешнего telemetry provider.
- HTTP request count и duration для User API и Admin API.
- Worker counters для publish, processing, retry, deduplication и dead-letter.
- Worker gauges для BullMQ и задержки самого старого pending outbox event.
- Worker HTTP endpoints `/health`, `/ready` и `/metrics` на отдельном порту.
- Readiness Worker проверяет PostgreSQL и Redis без раскрытия ошибок.

Не входят tracing backend, dashboards, alerts, production scraping и
domain-specific business metrics. Исключение, добавленное 2026-09-06: безопасные
агрегаты состояния GDPR-операций и управляемый Admin retry.

## Требования

- Labels имеют ограниченную кардинальность и не содержат ID, payload, token,
  email или другие персональные данные.
- HTTP route label использует route template, а не исходный URL.
- `/health` не зависит от внешних компонентов.
- `/ready` возвращает `503`, если PostgreSQL или Redis недоступны.
- Формат `/metrics` совместим с Prometheus text exposition format.
- Worker корректно закрывает HTTP server вместе с остальными соединениями.

## Acceptance criteria

- API и Admin API экспортируют HTTP count/duration.
- Worker экспортирует job/outbox/queue gauges и counters.
- Readiness имеет positive и negative tests.
- Метрики не содержат payload и диагностические тексты ошибок.
- `pnpm verify` проходит.

## План реализации

1. Добавить общий in-memory metrics registry в `@matiq/backend`.
2. Подключить HTTP middleware и `/metrics` в оба API.
3. Инструментировать Worker dispatcher и consumer.
4. Добавить Worker observability server и проверки зависимостей.
5. Добавить unit/integration tests и обновить аудит.

## Verification results

- Расширение 2026-09-06: общая PostgreSQL-модель агрегатов, Admin-only GET/POST,
  немецкий Admin UI, Prometheus gauges и повтор зависших/dead-letter операций.
  Retry требует MFA Admin, недавнюю reauthentication и точное подтверждение,
  создаёт audit event и не раскрывает payload, ошибки или идентификаторы.
  Backend 27, Worker 19 и Admin API 38 unit-тестов прошли; Admin PostgreSQL
  integration 9 тестов и отдельный Admin Chromium E2E прошли.
- Shared metrics registry tests: 5 passed (включая существующие policies).
- User API observability tests: 4 passed.
- Admin API health/metrics tests: 4 passed.
- Worker unit tests: 8 passed.
- Worker PostgreSQL/Redis integration tests: 3 passed.
- Typecheck: passed.
- OpenAPI documents regenerated.
- Full repository verification: `pnpm verify` passed.

## Known limitations

- Метрики хранятся в памяти процесса и сбрасываются при рестарте.
- Scraping, retention, dashboards и alerts настраиваются при выборе production
  observability stack.
- Application предоставляет gauges и Admin-представление, но отправка alerts во
  внешний канал остаётся production-настройкой.
- В production доступ к `/metrics` должен быть ограничен внутренней сетью или
  reverse proxy; application payload и персональные данные endpoint не содержит.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-06
- Related code: `packages/backend`, `apps/api`, `apps/admin-api`, `apps/worker`
