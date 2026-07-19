# ADR-0006: EU data residency and provider governance

## Status

Accepted

## Context

MATIQ handles account, assessment, viewing, payment-reference, and trainer
financial data for the German market.

## Decision

Host primary data, video, logs, analytics, and backups in the EU. An
international provider requires explicit approval after DPA, subprocessor,
transfer, retention, deletion, and security review. Minimise AI payloads and
keep deterministic operation available without AI.

## Alternatives

- Provider choice based only on features or price: rejected.
- EU-only providers without exception: safer but may unnecessarily block a
  compliant service; explicit review is retained.

## Consequences

Data location and processor inventory become production gates. Account deletion
must include processors and backup lifecycle. Legal review remains required.

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: All personal-data modules and infrastructure
