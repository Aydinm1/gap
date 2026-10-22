# ADR 0016: Viewer published-program access

- **Status:** Accepted
- **Date:** 2026-10-22
- **Supersedes:** Earlier two-role access limitation
- **Superseded by:** None

## Context

Board members need program/resources access without enrolling, inflating cohort counts,
receiving review/attendance obligations or gaining administrative/private learner access.
The existing admin preview depends on a privileged workspace and cannot be granted to them.

## Decision

Add `viewer` in a separate enum migration before using the value. Keep verified UC Davis
Google and active-roster authority. A user-scoped `/explore` loader reads only published
content in active/archived cohorts and narrow draft catalogs, never participants, student
work, attendance or Monday records. Reuse visual components, not admin data loaders.

Separate `can_read_content` from `can_learn`, which explicitly excludes viewers. Deny
Viewer enrollment/submission reads and historical submitted files, even with retained
enrollment history. Permit current published assignment-PDF downloads, not uploads.
Actions and DB/Storage independently authorize; service-only upload operations reject
Viewer actors before get/cancel/finalize. Profiles remain mirrors of live roster authority.

Viewer access creates no enrollment. Database role/enrollment guards share provisioning's
transaction advisory lock, reject Viewer enrollment and refuse converting enrolled active/
draft participants until participation is explicitly resolved. Do not delete history.
Ordinary deactivation/edits remain possible; a historical cohort later reactivated still
cannot confer Viewer submission or attendance access.

Browse without personal progress/status/attendance. Practice text, links and selected
files stay component-local, with saving/uploading disabled and reset on leaving the assignment.

## Consequences

Portal access can grow without changing participant/review/attendance counts. Future
participation requires explicit role change and enrollment. Archived published access is
Viewer-specific, not automatically granted to ordinary members. Hosted migrations, real
accounts, commit/push/deployment remain separately authorized release work.

## Alternatives considered

- Admin role exposes editing, rosters and private learner records unnecessarily.
- Enrolled members create participation/assignment/attendance obligations.
- Granting admin preview still exposes privileged data-loading boundaries.
