# SPEC-0006: Защищённые playback-сессии и доверенный прогресс

## Metadata

- Status: Verified
- Owner: MATIQ team
- Created: 2026-08-24
- Updated: 2026-08-24
- Related requirements: FR-032, FR-033, FR-034, NFR-SEC-006, NFR-SEC-007
- Related issues: не указаны
- Related ADR: не требуется для provider-neutral слоя
- Figma: Not applicable

## Problem

User API выдаёт signed URL непосредственно на исходный объект и принимает произвольное
значение просмотренных секунд от клиента. Entitlement проверяется только в момент выдачи
URL, а повторная доставка и подмена прогресса не контролируются.

## Goal

Выдавать авторизованному пользователю короткоживущую playback-сессию после проверки
публикации и entitlement, принимать идемпотентные heartbeat-события и засчитывать
прогресс только после серверной проверки последовательности и активности.

## Non-goals

- выбор и подключение production-видеопровайдера;
- DRM и forensic watermarking;
- публичный preview без авторизации;
- финансовый verified-watch ledger и асинхронный remuneration worker;
- окончательные значения TTL и heartbeat interval.

## Current behavior

`GET /content/videos/:id/playback` возвращает S3-compatible signed URL со сроком 300
секунд. `POST /content/videos/:id/watch` доверяет `watchedSeconds`, переданному клиентом.

## Expected behavior

Playback-ответ содержит идентификатор сессии, одноразово раскрываемый bearer token,
время истечения, режим и непрозрачный watermark id. Каждый heartbeat сохраняется как
неизменяемое событие; дубликат не увеличивает прогресс. Для спортсмена одновременно
активна не более чем одна полная playback-сессия.

## Actors and permissions

- ATHLETE/TRAINER: активная подписка или trial обязательны.
- EDITOR/ADMIN: могут просматривать опубликованный контент без подписки.
- Все операции привязаны к аутентифицированному пользователю.

## Scenarios

### Successful scenario

Given опубликованное видео и действующий entitlement
When пользователь открывает видео и отправляет последовательные heartbeat
Then сервер создаёт сессию, принимает валидные события и обновляет прогресс до 80%+
для завершения урока.

### Alternative scenario

Given уже активная полная сессия пользователя
When создаётся новая полная сессия
Then предыдущая сессия отзывается.

### Failure scenario

Given неверный token, истёкшая сессия, дубликат sequence или невозможный скачок
When приходит heartbeat
Then прогресс не увеличивается и API возвращает контролируемую ошибку.

## Functional requirements

- SPEC-FR-001: Создавать playback-сессию только после entitlement и publication check.
- SPEC-FR-002: Хранить только SHA-256 hash секрета сессии.
- SPEC-FR-003: Дедуплицировать heartbeat по session/idempotency key и sequence.
- SPEC-FR-004: Не учитывать невидимое, неактивное, слишком быстрое или нелинейное
  воспроизведение.
- SPEC-FR-005: Сохранять прежний endpoint прогресса только для EDITOR/ADMIN как
  временный совместимый административный путь.

## Business rules

- BR-001: Завершение видео наступает при доверенном прогрессе не менее 80% длительности.
- BR-002: Новый FULL-сеанс отзывает прежний активный FULL-сеанс пользователя.
- BR-003: Heartbeat не может уменьшить уже сохранённый прогресс.

## Inputs and outputs

Playback возвращает `playbackSessionId`, `playbackToken`, `expiresAt`, `mode`,
`watermarkId`, provider-neutral `playbackUrl` и существующий контекст урока. Heartbeat
принимает token, idempotency key, sequence, позиции, активную длительность, скорость,
видимость/активность и client timestamp.

## Validation

Позиции неотрицательны, sequence положительный, active duration ограничен 60 секундами,
скорость находится в диапазоне 0.25–2.0, idempotency key имеет длину 8–128 символов.

## Data changes

Добавляются `PlaybackSession` и `PlaybackHeartbeat`, enum режима и статуса, уникальные
индексы `(sessionId, idempotencyKey)` и `(sessionId, sequence)`. Удаление пользователя
или видео каскадно удаляет связанные сессии и события.

## API or contract changes

- Расширяется `GET /content/videos/:id/playback`.
- Добавляется `POST /content/videos/:id/heartbeat`.
- `POST /content/videos/:id/watch` помечается deprecated и запрещается спортсменам.

## UI behavior

Видеостраница отправляет heartbeat примерно каждые 15 секунд и при pause/end, не
показывает token и watermark id пользователю и сохраняет существующие состояния ошибок.

## Security

Token раскрывается только при создании сессии, хранится в БД в виде hash и проверяется
constant-time сравнением. Одна активная FULL-сессия ограничивает совместное использование.
Production-адаптер не должен отдавать URL исходного файла.

## Failure behavior

Неуспешный heartbeat не меняет `VideoWatch`. Ошибка storage provider не создаёт успешно
выданную сессию. Повтор с тем же idempotency key возвращает сохранённый результат.

## Edge cases

- EC-001: Heartbeat после истечения или отзыва сессии отклоняется.
- EC-002: Позиция ограничивается длительностью видео.
- EC-003: Неизвестная длительность не может автоматически завершить видео.

## Compatibility

Playback-ответ расширяется без удаления существующих полей. Legacy watch endpoint остаётся
для административных клиентов, но перестаёт быть доверенным путём спортсмена.

## Observability

Heartbeat хранит server receive time и rejection reason. HTTP correlation id продолжает
обрабатываться общим middleware.

## Acceptance criteria

- [x] AC-001: Сессия не создаётся без entitlement или для unpublished видео.
- [x] AC-002: В БД нет открытого playback token.
- [x] AC-003: Повторный heartbeat не увеличивает прогресс.
- [x] AC-004: Невалидная активность не увеличивает прогресс.
- [x] AC-005: Новый FULL-сеанс отзывает предыдущий.
- [x] AC-006: Web player использует heartbeat API.
- [x] AC-007: Миграция, unit/integration, contract и полная verification проходят.

## Test scenarios

### Unit

Проверки entitlement, token, дедупликации, sequence, активности, completion threshold и
отзыва предыдущей сессии.

### Integration

Миграция на disposable PostgreSQL и HTTP flow playback → heartbeat → duplicate.

### Contract

OpenAPI содержит новую схему heartbeat и расширенный playback response.

### E2E

Запуск существующего критического web flow при доступном окружении.

### Visual

Not applicable.

### Manual

Проверить, что web player не вызывает legacy watch endpoint.

## Constraints

Не выбирать production provider и не заявлять HLS/DASH/DRM реализованными. Не считать
этот прогресс финансово верифицированным просмотром.

## Open questions

- [ ] Production-видеопровайдер и формат manifest URL.
- [ ] Финальные TTL, heartbeat interval и rate-limit policy.
- [ ] Политика публичного preview и trial remuneration.

## Implementation plan

1. Добавить модели и миграцию.
2. Реализовать lifecycle сессии, token hashing и heartbeat validation.
3. Подключить controller/OpenAPI и web player.
4. Добавить unit/integration tests и выполнить verification.

## Verification results

- `pnpm.cmd db:generate` — passed.
- `pnpm.cmd openapi:generate` — passed.
- Все 26 миграций применены с нуля к disposable PostgreSQL — passed.
- `pnpm.cmd --filter @matiq/api test:integration` — 5 файлов, 7 тестов passed;
  HTTP flow playback → heartbeat → duplicate включён.
- `pnpm.cmd verify` — format, architecture, lint, typecheck, unit tests и build passed.
- `git diff --check` — passed.

## Known limitations

Локальный S3-compatible adapter остаётся только development fallback; production provider
не выбран. Синхронный прогресс пользователя не является remuneration ledger.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-24
- Related code: `apps/api/src/modules/content`, `apps/web/src/features/video`
