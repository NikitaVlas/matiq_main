# SPEC-0009: Договоры тренеров и ручные расчётные отчёты

## Metadata

- Status: Verified
- Owner: MATIQ team
- Created: 2026-08-26
- Updated: 2026-08-26
- Related requirements: FR-PAY-001 — FR-PAY-009, FR-ADMIN-001, NFR-SEC-001,
  NFR-SEC-002, NFR-SEC-006, NFR-REL-001, NFR-OBS-002
- Related ADR: Not applicable
- Figma: Not applicable

## Problem

Подтверждённое время просмотра уже собирается, но MATIQ не может сохранить
версию условий тренера, воспроизводимо закрыть месяц и подготовить защищённый
отчёт для ручной выплаты.

## Goal

Admin управляет неизменяемыми версиями условий и ежемесячными отчётами, а
Trainer видит только собственную статистику и отчёты. Перевод денег остаётся
вне MATIQ.

## Non-goals

- автоматические банковские переводы и интеграция с PSP для выплат;
- электронная подпись и загрузка юридического PDF в этом срезе;
- налогообложение тренера и генерация налоговых документов;
- вознаграждение за будущие Premium-курсы.

## Current behavior

`VerifiedWatchInterval` хранит уникальное подтверждённое paid/trial-время и
Admin видит агрегаты. Договоров, расчётных периодов и финансовых отчётов нет.

## Expected behavior

- Admin создаёт draft-версию договора и активирует её отдельным действием.
- Активированная версия не редактируется; изменение создаёт следующую версию.
- Admin создаёт один snapshot календарного месяца из введённых финансовых
  агрегатов и подтверждённого времени.
- Система рассчитывает 30% фонда, доли тренеров и перенос до порога 50 EUR.
- Admin последовательно переводит отчёт через `REVIEWED`, `APPROVED`, `PAID` или
  аннулирует его как `VOID` с причиной.
- Trainer получает только собственные агрегаты и отчёты.

## Actors and permissions

- `Admin`: CRUD draft-договоров, активация, расчёт, review/approve/paid/void.
- `Trainer`: read-only доступ только к собственным агрегатам и отчётам.
- `Editor` и `Athlete`: доступа к финансовым endpoint нет.

## Functional requirements

- `SPEC-FR-001`: версия договора хранит даты действия, участие в фонде,
  fixed fee, EUR, особые условия и ссылочные метаданные закрытого документа.
- `SPEC-FR-002`: периоды активных договоров одного тренера не пересекаются.
- `SPEC-FR-003`: отчёт сохраняет snapshot политики, входов и `agreementId`.
- `SPEC-FR-004`: trial-время имеет вес 0%, но показывается отдельно.
- `SPEC-FR-005`: все денежные операции используют целые euro cents.
- `SPEC-FR-006`: повторное создание того же месяца не создаёт второй период.
- `SPEC-FR-007`: каждое финансовое изменение создаёт audit event.

## Business rules

- `BR-001`: `net = gross - VAT - refunds - chargebacks - PSP fees`.
- `BR-002`: `pool = floor(net × 30 / 100)`.
- `BR-003`: фонд распределяется по paid verified time методом largest
  remainder, чтобы сумма долей точно совпадала с фондом.
- `BR-004`: Trainer без действующего договора или без участия в фонде не
  получает переменную долю; fixed fee берётся из действующей версии договора.
- `BR-005`: если paid-время равно нулю, фонд не распределяется.
- `BR-006`: сумма менее 5000 cents переносится; иначе становится payable.
- `BR-007`: approved/paid snapshot неизменяем; ошибки исправляются новым
  периодом или документированной корректировкой до approval.

## Validation

- месяц имеет формат `YYYY-MM`; денежные входы — неотрицательные integers;
- вычеты не могут превышать gross revenue;
- `validUntil` позже `validFrom`; fixed fee неотрицателен;
- special terms и document metadata ограничены по длине;
- переходы статуса выполняются только в разрешённом порядке.

## Data changes

Добавляются `TrainerAgreement`, `TrainerSettlementPeriod` и
`TrainerPayoutReport`, enum статусов, уникальные ограничения версий/месяцев и
индексы trainer/status. Миграция только добавляющая; rollback — удаление новых
таблиц и enum до появления production-данных.

## API or contract changes

- Admin: `/admin/trainer-finance/agreements`, activation, periods, report status.
- User API: `GET /trainer-finance/overview` для текущего Trainer.
- Ответы исключают банковские данные, чужие договоры и коммерческие условия
  других тренеров.

## UI behavior

Admin получает немецкий интерфейс договоров и закрытия месяца с loading,
empty, error и success состояниями. Trainer dashboard показывает paid/trial
время и собственные отчёты; чужие данные не запрашиваются.

## Security

- Admin endpoint защищены существующими MFA-session guard и ролью `ADMIN`.
- Trainer endpoint защищён session guard и серверной проверкой роли/ownership.
- Prisma-запросы параметризованы; финансовые данные валидируются на сервере.
- Договоры не содержат банковских, паспортных и налоговых секретов.
- Мутации аудитируются без чувствительных данных.

## Failure behavior

Транзакция полностью откатывается при ошибке расчёта. Конфликт версии, месяца
или периода возвращает `409`; некорректный переход — `400`; отсутствие права —
`401/403`. Повторный расчёт существующего месяца возвращает конфликт.

## Edge cases

- отрицательный net revenue запрещён;
- тренер удалён после просмотра — snapshot trainerId остаётся в агрегате;
- остаток переносится только из последнего не-VOID отчёта предыдущих периодов;
- округлённые центы фонда распределяются детерминированно.

## Compatibility

Изменение добавляющее. Существующие playback и viewing endpoint не меняются.

## Acceptance criteria

- [x] AC-001: Admin создаёт и активирует непересекающиеся версии договора.
- [x] AC-002: Месяц рассчитывается воспроизводимо по утверждённой формуле.
- [x] AC-003: Paid/trial разделены, trial не влияет на деньги.
- [x] AC-004: Статусы и audit соблюдают разрешённый lifecycle.
- [x] AC-005: Trainer видит только собственные данные.
- [x] AC-006: UI обрабатывает loading/empty/error/success.
- [x] AC-007: Миграция, unit, integration, OpenAPI и build проходят.

## Implementation plan

1. Добавить Prisma-модели и additive migration.
2. Реализовать расчёт как чистые тестируемые функции.
3. Добавить Admin API с DTO, транзакциями, lifecycle и audit.
4. Добавить own-only Trainer API.
5. Добавить немецкие Admin и Trainer UI.
6. Добавить unit/integration/permission tests и обновить OpenAPI.

## Verification results

- `pnpm db:generate` — passed после разрешённой загрузки/проверки Prisma binary.
- `pnpm openapi:generate` — passed; User/Admin OpenAPI и contracts обновлены.
- 29 миграций применены с нуля к disposable PostgreSQL database
  `matiq_test_trainer_finance_20260826`; database после проверки удалена.
- `pnpm --filter @matiq/admin-api test` — 10 files, 34 tests passed.
- `pnpm --filter @matiq/api test` — 15 files, 46 tests passed.
- `pnpm verify` — passed: format, architecture, lint, typecheck, unit tests,
  production builds.
- `git diff --check` выполняется при финальном review.
- Browser E2E и ручная визуальная проверка не выполнялись.

## Known limitations

- PDF-файл договора пока загружается в закрытое EU object storage вне этого
  среза; модель хранит только storage key, checksum, имя и дату.
- Выплата выполняется вручную вне MATIQ.
- Финансовые сроки хранения утверждены как инженерный baseline в
  `docs/architecture/privacy-data-lifecycle.ru.md` и требуют юридической
  проверки до production.
- Автоматическое закрытие через Worker не включено: Admin явно создаёт месяц,
  а advisory lock и возрастающий порядок месяцев защищают перенос остатка.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-02
- Related code: Trainer finance modules, Prisma schema, Admin Web, User Web
