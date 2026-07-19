# ADR-0001: Модульный монолит и отдельные процессы

## Status

Accepted

## Context

MATIQ нужны отдельные public/admin границы доверия и надёжные фоновые задачи,
но одной команде важны быстрые изменения и транзакционная согласованность.

## Decision

Использовать один модульный монолит NestJS с общими domain/application-модулями
и отдельными процессами User API, Admin API и Worker. `web` и `admin-web` —
отдельные Next.js deployables. Микросервисы в MVP не вводятся.

## Alternatives

- Один API: проще, но шире административная поверхность атаки.
- Независимые сервисы: лишняя operational/consistency стоимость.
- Два дублирующих backend: отклонено из-за расхождения правил.

## Consequences

Процессы масштабируются отдельно, бизнес-логика остаётся общей. Границы модулей
контролируются кодом и тестами. PostgreSQL остаётся общей зависимостью.

## Migration

Вынести существующие use cases API в общие модули, затем добавить `admin-api`,
`admin-web` и `worker` без изменения действующих user-контрактов.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Backend process hosts и общие модули
