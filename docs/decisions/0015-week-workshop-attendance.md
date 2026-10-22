# ADR 0015: Week workshop attendance

- **Status:** Accepted
- **Date:** 2026-10-21
- **Supersedes:** Earlier admin-only attendance scope (no separate ADR)
- **Superseded by:** None

## Context

GAP needs phone self-check-in with admin correction, without a calendar, grading or
location tracking. Returning participants require cohort-specific history. Scanning must
not automatically record attendance or put its code in OAuth return URLs.

## Decision

Workshop is an ordered resource category; slides remain separate. One session maps to
each week. An active cohort/published week can open a static six-character code/QR for
two hours using DB time. Redisplay preserves it; explicit reopening renews date/code/window
without clearing marks. A session lock serializes check-in, closing and corrections.

Private tables hold codes, failures and append-only actor/time correction history.
User-scoped RPCs recheck live verified Google/UC Davis roster authority. Members are
matched to enrolled participation, limited to ten failed attempts per session/person in
five minutes, and can read only authorized context/own receipts. No direct client writes.
Admin corrections compare versions and work after closure. Present receipts are idempotent
after current authority is verified, even after close.

Generate QR images locally. The generic `/attendance/[sessionId]#code=…` landing captures
the fragment in tab storage, removes it from the address bar, then uses a clean login
return path. Only Mark me present writes attendance. GET and scanning never mark anyone.

## Consequences

Explicit Refresh/subsequent fetches replace realtime; expiry needs no scheduled job.
Present/Not recorded imply no absence, lateness, penalties or assignment completion.
History restricts enrollment/week deletion. Failed attempts remain private; retention
maintenance is deferred. The shared code is not proof of physical presence. No percentages,
GPS/device tracking, rapid rotation or Monday sync. Hosted release requires separate approval.

## Alternatives considered

- Admin-only marks: retained as fallback, insufficient for self-check-in.
- Rapid rotation/location checks: unnecessary friction.
- Query/OAuth codes: avoidable request-log exposure.
- GET-based marking: unsafe for previews, reloads and accidental scans.
