# Проверка восстановления

## Локальный прогон

Запустить Docker Compose PostgreSQL (`docker compose up -d postgres`), установить
зависимости и сгенерировать Prisma client (`pnpm db:generate`). Затем выполнить:

`pnpm --filter @matiq/worker test:recovery`

Команда использует только локальную Compose-конфигурацию MATIQ и создаёт две
уникальные базы `matiq_drill_<random>_source/restore`. Рабочая база не копируется
и не изменяется. После применения SQL-миграций создаются синтетические данные;
pg_dump/pg_restore выполняют настоящее восстановление. Ledger, созданный после
backup, применяется дважды. Проверяется удаление профиля и сохранность второго
контрольного аккаунта. Dump и ledger остаются в памяти процесса.

Расширенный тест также проверяет сессии, verification/reset tokens, историю
просмотров, замену actor/entityId в audit и контрольные записи. Ошибка
`audit_pseudonymisation` исправлена 2026-09-04; расширенный прогон
`fff64e5c488bec9e91ed8668` прошёл, включая оба применения ledger. Это не доказывает
очистку metadata или необратимость разрыва связей во всех сохраняемых записях.

Отчёт: `test-results/recovery/<runId>.json`. Exit code 0 и `PASSED` означают успех.
Ошибка сохраняет только название фазы, без сырых ошибок БД/PII. При cleanup failure
оператор проверяет оставшиеся базы с идентификатором конкретного прогона; массовое
удаление по префиксу запрещено. CI публикует evidence на 30 дней.

## Production restore gate (ещё не выполнен)

- Запретить пользовательский трафик и фоновые side effects до завершения проверки.
- Восстановить одобренный backup в изолированную EU-среду.
- Получить актуальный ledger из независимого хранилища, включая удаления ПОСЛЕ backup.
- Применить ledger; не использовать только копию ledger из самого backup.
- Проверить credentials, доступ, согласованность финансов и внешних processors.
- Зафиксировать время восстановления, revision, ответственного и результат.
- Открыть трафик только после явного принятия результата владельцем.

Этот синтетический тест не подтверждает RPO/RTO production, восстановление видео,
внешних providers или независимого ledger-хранилища. Их выбор и эксплуатационная
автоматизация остаются launch gates.

## Document status

- Прогон `2d2416c643a3e42f4b72b346` (23,925 с) подтвердил ledger v2: создание и отмена
  расписания после backup, однократное исполнение и ожидание processor прошли.
  Общий статус FAILED только из-за отложенного `provider_identifiers_remain_linked`.
  Ledger v1 остаётся читаемым. Предыдущий preflight-результат ниже не проверял данные.
- Прогон `1e2672a459c615b4d22fffbb` (28,242 с): восстановление расписания,
  отмена до срока и однократное исполнение при конкуренции прошли. Общий FAILED
  на `remaining_privacy_review`: `deleted_account_subscription_still_active` и
  `provider_identifiers_remain_linked`. Изменения расписания после backup не
  переносятся ledger v1; это production gate. Ниже исторические результаты.
- Прогон `2ac5621c881ee1051feb7e6c`: новые проверки устойчивой renewal-операции,
  lease fencing и подтверждения прошли. Общий FAILED остаётся из-за прежних
  subscription/provider findings; fake provider используется только внутри теста.
- Текущий прогон `256c4923f199a1628b121d51`: metadata очищена, FAILED остаётся
  из-за подписок и provider links. План: [SPEC-0017](../specifications/SPEC-0017-deletion-billing.ru.md).
- Следующий пункт — исторический результат до исправления metadata.
- Последнее расширение: прогон `6b7dd26ea4098632354b1e8b` FAILED на
  `remaining_privacy_review`: остаются идентификаторы audit metadata и связи
  активной подписки с провайдером. Playback/heartbeats/intervals удаляются.
  Evidence содержит безопасные коды findings; прежние PASSED не покрывают новые проверки.
- Status: Active local runbook; production gates pending
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: apps/worker/src/recovery-drill.ts
