# MATIQ Trainer Remuneration and Manual Payouts

## MVP model

MATIQ creates a distributable pool equal to 30% of net subscription revenue for
each calendar month. This is the approved MVP reference and is captured by a
versioned financial policy. The pool is allocated in proportion to verified
paid watch time for each trainer's published videos.

```text
net revenue = subscriber payments - VAT - refunds - chargebacks - PSP fees
distributable pool = net revenue x 30%
trainer weight = trainer paid time / all-trainer paid time
trainer share = distributable pool × trainer weight
amount due = trainer share + fixed fee + adjustments + carried balance
```

MATIQ salaries, marketing, hosting, video infrastructure, and other operating
costs do not reduce the base before the pool is calculated; they are covered
from the remaining 70%. If the period has zero paid time, the pool is neither
allocated nor carried automatically and requires an Admin decision.

## Inputs

- only verified-viewing aggregates;
- the Video-to-Trainer attribution effective when viewing occurred;
- the financial policy and trainer agreement effective in the period;
- refunds, chargebacks, tax, and provider fees under the approved net-revenue
  definition;
- trial time reported separately with an economic weight of 0% and excluded
  from pool allocation.

Gross revenue is retained separately from the calculation base. Net revenue in
this model is not MATIQ accounting profit: only VAT, refunds, chargebacks, and
payment-provider fees are deducted from gross subscription revenue.

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

Calculation terms and every agreement version are stored in PostgreSQL. An
activated version is immutable, and each report retains its `agreementId`. A
signed PDF will be stored in private EU object storage; PostgreSQL keeps only
its storage key, SHA-256 checksum, original name, and upload timestamp. Bank,
identity-document, and tax secrets are not stored in the agreement record.

## Settlement period and report

The Worker closes a calendar month only after payment, refund, and viewing
aggregates are imported. Period boundaries use `Europe/Berlin`, while
timestamps are stored in UTC. A report contains:

- period and policy version;
- gross and net subscription revenue;
- pool size;
- paid and trial verified watch time;
- trainer weight and share;
- fixed fee, adjustments, and total;
- excluded anomalies;
- `DRAFT`, `REVIEWED`, `APPROVED`, `PAID`, or `VOID` status.

The minimum manual payout is EUR 50. A smaller accrued amount carries forward
without expiry until the accumulated balance reaches the threshold. Monetary
amounts are stored in euro cents with currency `EUR`.

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

- Tax documents and applicable retention periods.

## Document status

- Status: Approved MVP reference model; legal parameters pending
- Owner: MATIQ team
- Last reviewed: 2026-08-26
- Related code: Viewing analytics, trainer agreements, payout reports
