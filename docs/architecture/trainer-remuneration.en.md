# MATIQ Trainer Remuneration and Manual Payouts

## MVP model

MATIQ creates a distributable pool from net subscription revenue for a
settlement period. The pool share and net-revenue definition are versioned
financial policy and contract parameters. The pool is allocated in proportion
to verified watch time for each trainer's published videos.

```text
trainer weight = trainer verified time / all-trainer verified time
trainer share = distributable pool × trainer weight
total = trainer share + fixed fee + manual adjustments
```

If the period has zero verified time, the pool is not automatically allocated
and requires an Admin decision.

## Inputs

- only verified-viewing aggregates;
- the Video-to-Trainer attribution effective when viewing occurred;
- the financial policy and trainer agreement effective in the period;
- refunds, chargebacks, tax, and provider fees under the approved net-revenue
  definition;
- trial time provisionally reported as a separate statistic.

Until its economic weight is approved, trial time is not irreversibly mixed
with paid watch time.

## Trainer agreement

A versioned agreement supports:

- fixed fee;
- distributable-pool share;
- a combination;
- effective dates;
- content-specific terms;
- a future Premium-course sale share.

Changing an agreement does not recalculate closed periods without an explicit
adjustment.

## Settlement period and report

The Worker closes a calendar month only after payment, refund, and viewing
aggregates are imported. A report contains:

- period and policy version;
- gross and net subscription revenue;
- pool size;
- paid and trial verified watch time;
- trainer weight and share;
- fixed fee, adjustments, and total;
- excluded anomalies;
- `DRAFT`, `REVIEWED`, `APPROVED`, `PAID`, or `VOID` status.

A Trainer sees only their own report and aggregated statistics.

## Manual payout

1. The Worker creates `DRAFT`.
2. An Admin reviews sources and anomalies.
3. A second confirmation changes it to `APPROVED`.
4. Payment is executed outside MATIQ.
5. An Admin records date, amount, currency, and an external reference without
   banking secrets.
6. Status becomes `PAID` and an audit event is written.

An approved report is immutable. Errors use an adjustment or replacement
report. Automated money transfer is outside the MVP.

## Premium courses

A future course sale is a separate revenue stream. Trainer remuneration uses
net sale amount and the effective agreement, not watch time. It remains
disabled until a separate commercial specification is approved.

## Controls

- decimal/minor-unit arithmetic without floating point;
- reproducible calculation from an input snapshot;
- idempotent period closing;
- a reason and audit event for every adjustment;
- separate view, approve, and mark-paid permissions;
- legally approved financial retention before production.

## Open questions

- Pool percentage and exact net-revenue definition.
- Trial-time weight.
- Minimum payout and balance carry-forward.
- Tax documents and applicable retention periods.

## Document status

- Status: Approved operating model; formula parameters pending
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Viewing analytics, trainer agreements, payout reports
