# SPEC-0013: GDPR retention и оркестрация удаления аккаунта

## Метаданные

- Status: Verified
- Owner: MATIQ team
- Created: 2026-09-02
- Updated: 2026-09-02
- Related requirements: NFR-PRIV-003, NFR-PRIV-006, NFR-PRIV-007, NFR-REL-001
- Related architecture: `docs/architecture/privacy-data-lifecycle.ru.md`
- Figma: Not applicable

## Цель

Реализовать утверждённые сроки хранения как идемпотентные Worker jobs и заменить
синхронное частичное удаление аккаунта на processor-wide orchestration через
transactional outbox.

## Scope

- немедленная блокировка аккаунта, отзыв sessions и псевдонимизация прямых
  идентификаторов в API-транзакции;
- событие `privacy.account-delete.v1` в той же транзакции;
- удаление product/profile/assessment/viewing/playback данных Worker-ом;
- отвязка контента тренера без удаления курсов и видео;
- сохранение законно необходимых финансовых записей только под
  псевдонимизированным account subject;
- минимальное доказательство выполнения запроса без исходного user ID;
- периодическая очистка auth/session, playback/viewing, outbox/inbox/dead-letter,
  audit и deletion-receipt записей;
- configurable schedule, bounded batches, safe metrics/logging и повторяемость.

Не входят вызовы конкретных production providers, удаление provider backups,
юридический интерфейс legal hold и физическая ротация database backups.

## Требования

- API возвращает `accepted: true`, не ожидая полной processor-wide очистки.
- Повторный запрос и повторная доставка job не дублируют workflow и безопасно
  завершаются.
- Outbox payload очищается через 24 часа после успешной обработки; завершённые
  outbox/inbox записи удаляются через 30 дней.
- Dead-letter удаляется через 30 дней. Продление до 90 дней возможно только
  будущим документированным investigation workflow.
- Tokens удаляются после expiry/use плюс 7 дней, sessions — не позднее 24 часов
  после expiry/revoke.
- Playback sessions/heartbeats удаляются через 90 дней; verified viewer-level
  intervals — через 180 дней после закрытия месяца.
- Audit log удаляется через 5 лет; deletion receipts — через 3 года с конца года.
- Retention job не выводит payload или identifiers в logs.

## Acceptance criteria

- [x] Account deletion создаёт transactional outbox event и сразу блокирует вход.
- [x] Worker удаляет все утверждённые пользовательские product data и завершает
  receipt без исходного user ID.
- [x] Retention service применяет каждый утверждённый технический срок.
- [x] Unit tests покрывают cutoffs, идемпотентность и безопасную очистку payload.
- [x] Prisma migration проходит на disposable PostgreSQL.
- [x] `pnpm verify` и затронутые integration tests проходят.

## План реализации

1. Расширить deletion receipt и индексы Prisma additive migration.
2. Перевести Identity deletion на блокировку, псевдонимизацию и outbox event.
3. Добавить Worker account-deletion handler.
4. Добавить периодический retention service.
5. Добавить unit/integration tests и актуализировать документацию.

## Verification results

- Prisma client generation: passed.
- Additive migration deploy: passed на локальной и заново созданной disposable
  `matiq_test` PostgreSQL.
- API integration suite: 6 files / 10 tests passed, включая account deletion.
- Worker unit suite: 6 files / 13 tests passed.
- Worker PostgreSQL/Redis integration: 6 tests passed, включая end-to-end
  `privacy.account-delete.v1`.
- Full repository verification: `pnpm verify` passed.

## Known limitations

- Production providers ещё не выбраны, поэтому processor port реализован, но
  реальные provider adapters не подключены.
- Удаление backup-копий выполняется политикой инфраструктуры и требует
  production evidence; Worker повторно применяет только активные DB rules.
- Application-log и auth/security-log retention настраиваются в будущей
  production observability platform, поскольку эти журналы не хранятся в
  PostgreSQL MATIQ.
- Продление dead-letter до 90 дней требует будущего документированного
  investigation/legal-hold workflow; по умолчанию действует 30 дней.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-02
- Related code: Identity API, Worker, Prisma schema
