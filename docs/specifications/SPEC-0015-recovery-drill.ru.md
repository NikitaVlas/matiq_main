# SPEC-0015: Проверка восстановления PostgreSQL

## Scope и план

Одобренный следующий этап: автоматизация backup/restore evidence и подготовка
launch/security checklist. Production, providers и пользовательские данные не затрагиваются.

1. Создать две уникальные временные базы в локальном Compose PostgreSQL.
2. Применить SQL-миграции, создать синтетический профиль и контрольный аккаунт.
3. Выполнить настоящий pg_dump; после него сохранить отдельный deletion ledger.
4. Восстановить dump в другую базу; подтвердить наличие старого профиля.
5. Применить ledger дважды, проверить удаление профиля и сохранность контроля.
6. Удалить только созданные текущим прогоном базы и записать JSON evidence.

## Acceptance criteria

- Команда не принимает production URL или имя существующей целевой базы.
- Восстановление выполняет pg_restore с остановкой при ошибке.
- Неуспех проверки или cleanup даёт ненулевой exit code и failed evidence.
- Evidence содержит revision, время, результаты проверок, но не dump/ledger/PII.
- Запуск не считается production DR certification; RPO/RTO требуют решения владельца.

## Document status

- Status: Metadata fixed; subscription review still failing
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: apps/worker/src/recovery-drill.ts

## Проверка 2026-09-04

- Текущий прогон `256c4923f199a1628b121d51`: 31,4 с, metadata finding устранён;
  subscription/provider findings остаются FAILED. Общий helper используется обоими
  путями удаления; `pnpm verify` прошёл. Проект отмены: [SPEC-0017](SPEC-0017-deletion-billing.ru.md).

- Последнее расширение `6b7dd26ea4098632354b1e8b`: FAILED, 30,3 с. Playback,
  heartbeats и verified intervals удалены; идентификаторы audit metadata и связи
  активной подписки с провайдером остаются. Оба применения ledger и контрольные
  проверки прошли. Исправление обработчиков требует отдельного согласования;
  финансовая политика не менялась. Worker lint/typecheck прошли; verify не повторялся.

- Одобренное исправление: транзакционная замена ссылок actor/entityId по правилу
  обычного удаления; остальные поля события и контрольные записи сохраняются.
- Расширенный прогон `fff64e5c488bec9e91ed8668`: PASSED, 32,7 с, локальные
  незакоммиченные изменения. Проверены credentials, история просмотров, ссылки
  audit и повторное применение. `pnpm verify` прошёл. Миграций и изменений API нет.
- Metadata, финансовые данные/providers и полная необратимость разрыва связей
  не проверены; browser E2E и остальные integration suites повторно не запускались.

Результаты предыдущей базовой проверки:

- `pnpm verify`: passed после исправления строгих TypeScript типов.
- `pnpm --filter @matiq/worker test:recovery`: passed, 23.6 s.
- Evidence run ID: `66e5d17072dd6e4eb99894bf` (локальные незакоммиченные изменения).
- `git diff --check`: passed.
- До запуска Docker получен корректный FAILED/preflight report.
- CI job добавлен, но удалённо ещё не запускался. Browser E2E и полный security
  review не выполнялись в этом infrastructure-only срезе.
