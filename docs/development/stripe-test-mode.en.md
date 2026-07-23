# Stripe test mode

## Purpose

This runbook verifies the MATIQ monthly subscription before production payments are enabled.

## Local configuration

1. Create a Stripe test-mode Product and recurring monthly Price for `15.00 EUR`, VAT included.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` in a local `.env` file. Never commit them.
3. Start the API and forward events with:

```text
stripe listen --forward-to localhost:4000/billing/stripe/webhook
```

4. Copy the CLI webhook secret into `STRIPE_WEBHOOK_SECRET` and restart the API.

## Smoke flow

1. Sign in as an Athlete with a trial or expired subscription.
2. Open `/subscription`, confirm both digital-content consent checkboxes, and start Checkout.
3. Complete Stripe test checkout with a Stripe test card.
4. Confirm `customer.subscription.*` is accepted and an `ACTIVE` subscription is stored.
5. Simulate a failed invoice and confirm `PAST_DUE` retains access for at most three days.
6. Cancel the subscription; confirm Stripe sets `cancel_at_period_end` and access remains until `endsAt`.

## Production gate

Do not use live keys until the legal entity, Stripe account/DPA, consumer disclosures, VAT/invoice handling, and secrets manager are approved.

## Document status

- Status: Test-mode ready
- Owner: MATIQ team
- Last reviewed: 2026-07-23
