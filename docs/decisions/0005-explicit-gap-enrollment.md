# ADR 0005: Explicit GAP enrollment approval

- **Status:** Accepted
- **Date:** 2026-09-14
- **Supersedes:** None; resolves the enrollment-trigger question left open in [ADR 0004](0004-monday-recruiting-and-gap-reporting.md)
- **Superseded by:** None

## Context

Recruiting acceptance and readiness to grant GAP access are separate milestones. A lead
needs a deliberate enrollment step when the accepted cohort list is ready.

## Decision

Use an unchecked-by-default “Enroll in GAP” checkbox on each Monday applicant record.
An authorized GAP lead checks it to request enrollment. Acceptance alone grants no access.
The server validates acceptance, target cohort, identity, and existing roster rules before
creating or linking GAP person, enrollment, and member access records. This never grants
an administrator role or silently reactivates previously deactivated access.

Track the processing result separately: pending, enrolled, or failed, with a successful
timestamp or actionable error. Retries must not duplicate records or reset history.
Unchecking does not withdraw, revoke access, or delete data; use explicit GAP admin actions.

This is an approved contract, not a configured Monday checkbox or deployed integration.

## Consequences

Leads control when accepted applicants enter GAP without a second confirmation screen.
Implementation requires verified approval permissions, duplicate-safe provisioning,
visible failure handling, and the pending Supabase/authentication foundation.

## Alternatives considered

- Enroll automatically on acceptance: conflates recruiting decisions with access readiness.
- Require another confirmation inside GAP: adds a second approval step to the chosen workflow.
