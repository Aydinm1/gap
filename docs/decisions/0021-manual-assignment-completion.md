# ADR 0021: Manual assignment completion without a submission

**Status:** Accepted
**Date:** 2026-10-28

## Context

Week 1 allowed a single teammate to submit before teams were configured. Those
individual attempts must retain their original ownership, timestamps, files and review.
Other participants need completion credit, not access to someone else's work.

## Decision

Store grant/revoke history in `assignment_completions`, separately from attempts. Live
admins grant only for published Individual assignments, active cohorts, enrolled active
non-Viewer participants and no current attempt. Members read their own current credit;
admins read history. Re-grant produces a new receipt. Duplicate grants/revokes are safe
and stale undo never revokes a later receipt. No synthetic attempts, copied files or
shared feedback.

Credit counts as Complete in member progress and admin completion/missing-work filters,
not received/awaiting totals. The existing provisioning/submission gate serializes grants
with role changes and text/link/file saves. Pending uploads cannot finalize after credit.
Assignments with credit history cannot change submission mode or be deleted. Undo only
rescinds credit; it does not rewrite submissions or participation outcomes.

## Consequences

This narrowly amends the earlier rule that completion always requires an approved
attempt. Proper Team assignments keep their existing submission/review workflow. No
automatic Week 1 backfill is performed; an admin chooses each person and assignment.
Hosted migration, release and actual participant updates require separate authorization.
