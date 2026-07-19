# ADR-0003: Детерминированный assessment и AI только для объяснения

## Status

Accepted

## Context

Рекомендации должны быть воспроизводимыми, экспертными и безопасными.
Generative AI не может быть источником методологии или score.

## Decision

Admin публикует экспертный банк, branching и версионируемые scoring rules.
Детерминированный код считает score и выбирает рекомендации. AI получает
минимальный structured result и только объясняет его. Без AI продукт работает.

## Alternatives

- AI-вопросы или AI-рекомендации: отклонены как невоспроизводимые.
- Полностью без AI: безопасно, но нет персонального объяснения.

## Consequences

Результат ссылается на версии правил/контента и machine-readable reasons.
Формула проверяется на реальном question bank. AI не меняет score или Roadmap.

## Document status

- Status: Active
- Owner: Команда MATIQ
- Last reviewed: 2026-07-19
- Related code: Assessment, recommendation, AI adapter
