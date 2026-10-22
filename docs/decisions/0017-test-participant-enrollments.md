# ADR 0017: Test participant enrollments

- **Status:** Accepted
- **Date:** 2026-10-22
- **Supersedes:** None
- **Superseded by:** None

## Context

Leads need to exercise real student submissions, feedback and attendance without
inflating official cohort totals. Viewer and read-only previews intentionally cannot save.

## Decision

Add `cohort_enrollments.is_test boolean not null default false`, separate from
participation status and portal role. Keep the enrollment's ordinary enrolled/completed/
withdrew lifecycle, outcome constraints, returning history and all access restrictions.
Test access is not a bypass: active approved UC Davis Google identity, non-Viewer role,
active cohort, enrolled participation and published content remain required.

Only live admins can change the flag through `set_test_participation` and its validated
server action. Existing direct table writes remain denied. Toggling the flag changes
no roles, submissions, files, attendance or outcomes; retries of enrollment preserve it.
Removing the flag deliberately includes the enrollment's retained work in official totals.

All official cohort denominators, active counts, review summaries/default queues and
attendance present counts exclude test enrollments. Dedicated test-only review and
attendance views permit exercising the same review/correction flows. Official summary
cards remain official even when viewing test work. Keep test queue context on review
back/next links. Future reporting/export must apply the same exclusion; no Monday
reporting implementation is added here.

## Consequences

A cohort can have 24 official participants plus test enrollments. Do not hardcode 24.
Member pages still show the test person's genuine saved progress/history. Authorized
admins can retain their Admin role while exercising their own enrolled member portal.
Marking an enrolled user as test does not make Viewer conversion valid or relax access.

## Alternatives considered

- A fourth participation status conflates reporting classification with access/lifecycle.
- Admin previews cannot test persistence; Viewer is intentionally read-only.
- Deleting/recreating test enrollments destroys history and risks real participant data.
