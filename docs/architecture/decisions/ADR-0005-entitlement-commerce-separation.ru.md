# ADR-0005: Разделение payment, subscription и entitlement

## Status

Accepted

## Context

Trial, subscription и будущая покупка Premium дают доступ через разные
коммерческие события. Provider status не должен проникать во все features.

## Decision

Разделить Payment, Subscription, Product/Price и Entitlement. Сервер выдаёт
playback по entitlement. Adapter переводит внешние состояния в состояния MATIQ.
Trial без карты является внутренним и никогда не конвертируется автоматически.

## Alternatives

- Проверять provider при каждом playback: хрупко.
- Один access boolean: не описывает expiry и Premium.

## Consequences

Webhook и reconciliation идемпотентно обновляют domain records. Доступ устойчив
к краткому отказу provider. Video access не придётся переписывать для Premium.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Billing, subscriptions, entitlement
