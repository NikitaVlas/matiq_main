# ADR-0004: Protected streaming and interval-based verified watch time

## Status

Accepted

## Context

MATIQ must protect curated video and distribute trainer revenue fairly. View
counts and summed client heartbeats are easy to manipulate.

## Decision

Keep originals private, deliver adaptive streams with short-lived scoped tokens,
and watermark full playback. Build verified time from deduplicated unique media
intervals supported by valid sessions and anti-abuse checks. Treat 80% as
viewed, never as mastered.

## Alternatives

- Public files or download URLs: rejected.
- Simple view count: unfair to long content and easy to inflate.
- Client-reported elapsed time: not trustworthy enough for finance.

## Consequences

Provider selection must support protected delivery. Raw events and derived
financial aggregates remain distinct. Absolute prevention of screen capture is
explicitly not promised.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Video, entitlement, viewing analytics
