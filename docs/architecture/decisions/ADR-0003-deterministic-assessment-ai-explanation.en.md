# ADR-0003: Deterministic assessment with AI explanation only

## Status

Accepted

## Context

Recommendations must be reproducible, expert-controlled, and safe. Generative
AI cannot be the source of combat-sports methodology or scoring.

## Decision

Admins publish an expert question bank, branching, and versioned scoring rules.
Deterministic code calculates scores and selects recommendations. AI receives a
minimal structured result and may only explain it. The product works when AI is
unavailable.

## Alternatives

- AI-generated questions or recommendations: rejected as non-reproducible.
- No AI: safe but loses personalised explanation.

## Consequences

Every result references rule and content versions and has machine-readable
reasons. Real question-bank fixtures are required before finalising aggregation
math. AI output is validated and cannot alter stored scores or Roadmap items.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Assessment, recommendation, AI adapter
