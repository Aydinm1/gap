# ADR 0022: Guided team projects separate preparation from graded work

**Status:** Accepted
**Date:** 2026-10-28

## Decision

Add an opt-in reusable Guided project workflow to Team assignments. Save independent
team research before revealing an admin-authored recommendation; allow alternative
requests with live admin approval, then gate one ordinary final document submission.
Only final attempts enter grading counts. Preserve original research, working revisions,
proposal/decision history and database actor/timestamps in separate private tables.

Expose narrow user-scoped RPC projections, not private fields on shared published
assignment models. Recheck current identity/role/team access and expected versions in
transactions. Use the existing submission gate for preparation, decisions and final
insertion; final insertion freezes research/direction, catches old prepared uploads and
rejects textbox payloads. Stable actor/request receipts recover lost save responses.
Lock team membership when research begins, so shared preparation cannot migrate to a
different group. Revealed recommendations are immutable; missing setup can be filled.

## Consequences

Admins configure guides in draft weeks and supply company-specific directions themselves.
Existing Standard assignments remain unchanged. Viewers get common instructions and
non-persisting practice only; admin previews explicitly select sample teams. Direction
approvals are not grades or completion. Changing a submitted project's direction and
correcting locked team membership remain outside this release. Hosted migration,
configuration and deployment require separate authorization.
