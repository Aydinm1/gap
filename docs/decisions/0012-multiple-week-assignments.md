# ADR 0012: Multiple required assignments per week

- **Status:** Accepted
- **Date:** 2026-10-21

## Context

GAP needs several independently submitted and reviewed assignments in a week. Treating
them as one payload would mix deadlines, PDFs, feedback and histories. The owner confirmed
that every assignment must be approved before its week counts as complete.

## Decision

Remove the unique week constraint on assignments and add deterministic ordering. Retain
all existing identifiers and per-assignment/enrollment attempt invariants. Save a week's
assignment collection atomically through an admin-authorized function; reject cross-week
IDs and deletion of referenced history. Reject old single-item saves on multi-item weeks.
Render separate member workspaces and admin editor cards. Select review by assignment ID
in the existing week submission route's query string. Aggregate module completion only
when all required assignments have a current approved attempt.

## Consequences

Assignments keep independent deadlines, PDFs, submissions and feedback. Adding work to
a published week can make it incomplete again. Weeks without assignments have no automatic
approval completion. Existing legacy links default to the first assignment; new links
always include the ID. No optional assignments, per-assignment publication, or learner
impersonation are introduced. Hosted migration and acceptance remain separately tracked.
