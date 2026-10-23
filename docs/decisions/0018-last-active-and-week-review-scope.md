# ADR 0018: Minimal Last active and explicit week review scope

- **Status:** Accepted
- **Date:** 2026-10-22
- **Supersedes:** Assignment-only admin overview and implicit first-assignment queue scope
- **Superseded by:** None

## Context

Leads need a single Last active timestamp, not an activity history, and need to see
whole-week completion without confusing people with assignment submission counts.

## Decision

Keep `private.account_activity` keyed by GAP person with only `last_active_at`. No
backfill, first visit, IP, device, page history or online/presence indicators. Visible
protected pages call an authenticated action; identity and database time are authoritative.
Upsert updates at most once per five minutes, including concurrent callers. Live roster,
verified UC Davis Google identity and active access remain required. Private table grants
are revoked; one no-argument RPC records self and one admin-only RPC reads timestamps.
Recording is best-effort and does not revalidate UI or block application use. Stored
timestamps are approximate visits, not proof of attention or continuous presence.

Use a dedicated pure week queue aggregator rather than changing the historical
single-assignment selector's implicit contract. The aggregate has one row per participant
and assignment, with composite keys and deterministic ordering. Week completion requires
all current attempts approved; zero assignments/participants has no completion percentage.
Official scope includes enrolled non-test participants only. Test progress is explicit;
official cohort outcomes stay separate. URL context retains week-wide or individual
assignment scope, status, search and audience through review and next-review navigation.

## Consequences

Existing profiles remain unchanged; no invented historical access evidence. Display —
until a new visible visit records activity. Viewer/admin/member visits count equally, but
only admins see the timestamps. Preview editors still produce no submission or upload
requests; the separately authorized page-activity action may record the admin/viewer visit.
No hosted release, real-account mutation or analytics provider is implied.

## Alternatives considered

- Auth last-sign-in omits continuing sessions and is not a verified GAP page visit.
- Middleware/authorization hooks also execute during prefetch and refresh.
- Summed approved assignment slots are not the number of people completing a week.
