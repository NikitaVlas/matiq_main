# ADR-0004: Защищённый streaming и подтверждённые интервалы

## Status

Accepted

## Context

MATIQ должен защищать видео и справедливо распределять доход. Счётчик views и
сумма client heartbeat легко накручиваются.

## Decision

Хранить originals приватно, выдавать adaptive stream через короткий scoped
token и watermark. Считать verified time как дедуплицированные уникальные
интервалы валидной session с anti-abuse. 80% означает просмотр, не освоение.

## Alternatives

- Public/download URL: отклонено.
- Количество просмотров: несправедливо к длинным видео.
- Client elapsed time: недостаточно надёжно для финансов.

## Consequences

Provider должен поддерживать protected delivery. Raw events отделены от
financial aggregates. Невозможность полностью запретить screen capture признана.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Video, entitlement, viewing analytics
