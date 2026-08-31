# SPEC-0010: Worker outbox, идемпотентность и dead-letter

## Metadata

- Status: Implemented
- Owner: MATIQ team
- Created: 2026-08-31
- Updated: 2026-08-31
- Related requirements: NFR-REL-001, NFR-OBS-001, NFR-SEC-005
- Related ADR: ADR-0001, DR-005, DR-008
- Figma: Not applicable

## Problem

Worker подключён к BullMQ, но обрабатывает произвольные задания без
PostgreSQL-outbox, устойчивой идемпотентности и контролируемого dead-letter
workflow. Сбой между изменением domain state и публикацией задания может
потерять работу, а повторная доставка может повторить побочный эффект.

## Goal

Создать provider-neutral основу надёжной фоновой доставки: PostgreSQL остаётся
источником истины, dispatcher повторяемо публикует outbox events в BullMQ,
consumer фиксирует обработку по стабильному idempotency key, а исчерпавшие
retry задания сохраняются для ручной диагностики и повторного запуска будущим
административным workflow.

## Non-goals

- подключение email, AI, video, payment или иных production-провайдеров;
- автоматическое закрытие финансовых периодов или выплаты тренерам;
- выполнение GDPR deletion/export;
- Admin UI для просмотра и повторного запуска dead-letter записей;
- distributed tracing и production alerting.

## Expected behavior

- Domain transaction может сохранить `OutboxEvent` с уникальным
  `idempotencyKey`.
- Dispatcher выбирает доступные неопубликованные события, добавляет BullMQ job
  с `jobId`, равным идентификатору outbox event, и только затем отмечает событие
  опубликованным.
- Повторный запуск dispatcher не создаёт логически второе задание.
- Consumer создаёт или повторно использует `InboxJob` и не выполняет уже
  завершённое задание повторно.
- Ошибка обрабатывается ограниченными retry с exponential backoff.
- После исчерпания попыток consumer сохраняет одну `DeadLetterJob` без payload
  в логах и помечает inbox как `DEAD_LETTER`.
- Неизвестный topic завершается ошибкой и проходит тот же retry/dead-letter
  путь.

## Data model

- `OutboxEvent`: topic, JSON payload, idempotency key, publish status,
  available/published timestamps и последняя ошибка публикации.
- `InboxJob`: уникальная ссылка на outbox event, topic, processing status,
  число попыток и диагностическая ошибка.
- `DeadLetterJob`: уникальная ссылка на inbox job, topic, безопасная ошибка и
  timestamp помещения в dead-letter.

Payload не копируется в dead-letter и не выводится в журналы.

## Reliability and security rules

- PostgreSQL — единственный источник истины; Redis можно восстановить.
- `jobId = outboxEvent.id` обеспечивает повторяемую публикацию.
- Завершённый inbox является авторитетным сигналом дедупликации.
- Ошибки в логах ограничиваются сообщением без stack и payload.
- Dispatcher использует ограниченный batch и блокировку PostgreSQL
  `FOR UPDATE SKIP LOCKED`.
- Shutdown закрывает polling, Worker, Queue и соединения.

## Acceptance criteria

- Повторная публикация одного outbox event не создаёт второй логический job.
- Повторная доставка завершённого job не вызывает handler.
- Успешная обработка переводит inbox в `COMPLETED`.
- Ошибка увеличивает attempts и сохраняет безопасное сообщение.
- Последняя ошибка создаёт ровно одну dead-letter запись.
- Unit tests не требуют Redis или PostgreSQL.
- Migration применяется к disposable PostgreSQL.
- `pnpm verify` проходит.

## Implementation plan

1. Добавить Prisma enums и модели outbox/inbox/dead-letter.
2. Добавить dispatcher repository и BullMQ publisher.
3. Добавить idempotent consumer и registry обработчиков.
4. Переподключить Worker entry point к dispatcher и consumer.
5. Добавить unit tests и integration/migration verification.
6. Актуализировать аудит реализации.

## Verification results

- Prisma schema validation: passed.
- Worker typecheck and lint: passed.
- Worker unit tests: 6 passed.
- Prisma migration deploy against disposable `matiq_test`: passed.
- Disposable PostgreSQL/Redis integration test: 2 passed.
- Full repository verification: `pnpm verify` passed.

## Known limitations

- Foundation содержит только безопасный системный `system.noop` handler.
- Бизнес-события подключаются отдельными утверждёнными спецификациями.
- Admin dead-letter UI и автоматический replay не входят в этот срез.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-31
- Related code: `apps/worker`, `apps/api/prisma/schema.prisma`
