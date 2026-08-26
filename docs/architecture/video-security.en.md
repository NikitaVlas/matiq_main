# MATIQ Video Security and Verified Viewing

## Purpose

This document defines media protection, access issuance, viewing accounting,
and anti-abuse signals. A browser cannot make screen recording or media
extraction impossible. The MVP goal is to keep originals private, constrain
access in time and scope, and make bulk copying uneconomical.

## Video delivery

1. Only an `Admin` uploads an original to private storage or an approved video
   provider.
2. The original never receives a public URL.
3. The provider produces adaptive HLS/DASH; progressive source-file download is
   prohibited.
4. Before playback, the Video module verifies the user, entitlement, content
   publication, and configured preview.
5. The client receives a short-lived playback token scoped to the user, asset,
   `FULL` or `PREVIEW` mode, and expiry.
6. The CDN/provider rejects expired, altered, or resource-mismatched requests.

Full playback displays a dynamic watermark using a stable session or user
reference without revealing the email address. An Admin selects a preview range
of at most 60 seconds.

## Entitlement

Full playback requires one of:

- an active seven-day trial;
- an active subscription;
- later, a separate Premium-course purchase entitlement;
- administrative content-review access.

A public visitor sees metadata and a preview but receives no full-stream token.
The server checks entitlement whenever issuing or refreshing a token; hiding a
button is not an access control.

## Viewing events

The client sends ordered heartbeat events containing at least:

- `playbackSessionId`, `userId`, and `videoId`;
- sequence number and idempotency key;
- previous and current media positions;
- monotonic active-play duration;
- playback rate and player activity/visibility;
- client time and server receipt time.

Raw events are immutable. In the MVP, the API synchronously records non-overlapping
verified intervals under an advisory lock and the Admin API builds a read-only ledger
aggregate. The Worker will close periodic financial snapshots. Redelivery must not
increase the result.

## Verified watch time

Verified time is the unique media-timeline coverage that:

- belongs to a valid active playback session;
- is supported by sequential heartbeats;
- does not exceed elapsed time adjusted for playback rate;
- excludes seeking, pauses, and inactive hidden playback;
- does not duplicate an already-counted interval;
- is not rejected by anti-abuse rules.

Aggregation uses a union of unique intervals, not a sum of heartbeats. A video
becomes `WATCHED` for the user after at least 80% of its full available duration
is verified. This means viewed, not mastered.

## MVP anti-abuse controls

- one active paid playback session per user;
- rate limits for session creation and heartbeats;
- timeline-jump rejection;
- idempotency-key and interval deduplication;
- server-side session-duration and token-TTL limits;
- anomaly flags for excessive time, concurrent devices, repetitive patterns,
  and unattended background playback;
- suspicious time excluded from reports until manual review;
- an audit trail for Admin decisions.

IP and device signals are used only where justified for security and have a
documented retention period.

## Failure policy

- An expired token is refreshed only after entitlement is checked again.
- Playback may continue during analytics degradation, with a bounded local
  event buffer; unverified data does not enter financial reporting.
- Provider failure never falls back to a public original.
- Revoked entitlement or publication blocks new tokens; issued tokens live no
  longer than their short TTL.

## Observability

Track token errors, entitlement denials, heartbeat lag, rejected-time share,
suspicious sessions, provider errors, and aggregation lag. Logs exclude
playback tokens, email, payment data, and full IP addresses unless justified.

## Open questions

- Video provider, DRM level, and CDN.
- Playback-token TTL and heartbeat interval after load testing.

## Document status

- Status: Approved product baseline; technical parameters pending
- Owner: MATIQ team
- Last reviewed: 2026-08-26
- Related code: Video, entitlement, viewing analytics, worker
