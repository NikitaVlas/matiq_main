# ADR-0006: Хранение в ЕС и управление providers

## Status

Accepted

## Context

MATIQ обрабатывает account, assessment, viewing, payment references и
финансовые данные тренеров на рынке Германии.

## Decision

Основные данные, video, logs, analytics и backups хранить в ЕС. Международный
provider требует явного одобрения после проверки DPA, subprocessors, transfers,
retention, deletion и security. AI payload минимизируется; без AI сохраняется
детерминированная работа.

## Alternatives

- Выбирать provider только по функциям/цене: отклонено.
- Полный запрет не-EU providers: безопаснее, но может блокировать compliant
  сервис; оставлена отдельная проверка.

## Consequences

Data location и processor inventory становятся production gates. Account
deletion включает processors и backup lifecycle. Legal review обязателен.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Все модули персональных данных и infrastructure
