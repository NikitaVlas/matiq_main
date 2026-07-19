# ADR-0002: Одна PostgreSQL и владение данными модулями

## Status

Accepted

## Context

Assessment, Roadmap, entitlement, viewing и reporting связаны транзакционными
данными. Отдельные базы преждевременно создадут распределённую согласованность.

## Decision

Использовать один PostgreSQL cluster в ЕС и одну migration history. Каждый
модуль владеет своими таблицами и repositories. Межмодульный доступ идёт через
application services или events. Redis не хранит единственную копию состояния.

## Alternatives

- Database per module: преждевременная operational/consistency стоимость.
- Общие таблицы без ограничений: быстро разрушает границы.

## Consequences

Транзакции и backup остаются проще. Владение обеспечивают code review,
architecture tests и размещение repositories. Выделение базы требует нового ADR.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Prisma schema, repositories, migrations
