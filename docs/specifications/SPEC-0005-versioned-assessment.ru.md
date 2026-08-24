# SPEC-0005: Версионированный assessment

## Metadata

- Status: Verified
- Owner: Команда MATIQ
- Created: 2026-08-24
- Updated: 2026-08-24
- Related requirements: FR-ASMT-003, FR-ASMT-004, FR-ASMT-005, FR-ASMT-008, FR-ASMT-009, FR-ASMT-010, FR-RMAP-001, FR-RMAP-002, FR-RMAP-007
- Related ADR: ADR-0003

## Goal

Сохранять незавершённый assessment и каждое завершённое вычисление как техническую версию, сохраняя для спортсмена только актуальный результат и Roadmap.

## Business rules

- BR-001: На пользователя и дисциплину существует не более одной активной незавершённой попытки.
- BR-002: Черновик не запускает trial и не меняет Roadmap.
- BR-003: Завершение попытки создаёт неизменяемую версию результата; предыдущие версии недоступны спортсмену.
- BR-004: Базовая оценка — детерминированное значение option `value` в шкале 1–5. Уверенность `SUFFICIENT` означает, что для навыка есть хотя бы один валидный сигнал; иначе `INSUFFICIENT_DATA`. Недостаток данных не становится слабым навыком и не создаёт GAP-рекомендацию.
- BR-005: В этой поставке вопросник имеет версию `1`; публикация следующей версии не меняет уже созданные попытки.

## API or contract changes

- `PUT /assessment/draft` сохраняет валидные частичные ответы текущей попытки.
- `GET /assessment/attempt` возвращает текущую попытку и сохранённые ответы.
- `POST /assessment/submit` завершает текущую попытку только при полном наборе обязательных вопросов.

## Data changes

- Добавляются попытка assessment, её ответы и версия вычисленного результата с зафиксированной версией question bank.
- Существующий `Assessment` остаётся текущей проекцией для обратной совместимости до отдельной миграции потребителей.

## Acceptance criteria

- [x] Частичный ответ сохраняется и возвращается после перезагрузки.
- [x] Неполная попытка не создаёт score, Roadmap или trial.
- [x] Завершённая попытка использует снимок версии question bank.
- [x] У результата есть явно определённая confidence/insufficient-data семантика.
- [x] Повторное завершение создаёт новую техническую версию без показа истории спортсмену.

## Constraints

- AI не влияет на scores или рекомендации.
- Не собираются медицинские диагнозы.
- Существующие `/assessment/questions`, `/assessment/answers`, `/assessment/result` остаются совместимыми.

## Implementation plan

1. Добавить Prisma-модели и миграцию для attempts/version snapshots.
2. Выделить в service сохранение черновика, resume и финализацию.
3. Обновить OpenAPI DTO/controller и клиентские контракты.
4. Добавить unit/integration tests для draft, resume, completion и insufficient data.

## Known limitations

- Формула с несколькими взвешенными сигналами, branching и экспертный question bank будут расширением следующей версии; текущий baseline не подменяет их AI-логикой.

## Verification results

- Prisma client generation: passed.
- OpenAPI documents and generated TypeScript contracts: regenerated.
- Format, typecheck and unit tests: passed.
- Все 25 миграций применены с нуля к отдельной disposable PostgreSQL database.
- HTTP integration flow `draft → resume → completion → repeated completion`: passed.
- Полный repository `verify`: passed.

## Document status

- Status: Verified
- Owner: Команда MATIQ
- Last reviewed: 2026-08-24
- Related code: `apps/api/src/modules/assessment`, `apps/api/prisma/schema.prisma`
