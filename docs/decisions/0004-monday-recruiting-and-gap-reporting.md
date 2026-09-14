# ADR 0004: Monday recruiting and GAP reporting

- **Status:** Accepted
- **Date:** 2026-09-14
- **Supersedes:** None
- **Superseded by:** None

## Context

Club leadership needs recruiting and member outcomes in Monday.com, while GAP needs
private program records, files, and detailed review workflows in Supabase. Application
intake is expected to originate from a Monday form. Duplicating detailed program records
would create competing sources of truth and unnecessary exposure.

## Decision

Use Monday as the intended owner of applications, recruiting decisions, and club member
records. Supabase owns GAP enrollment/access, content, files, submissions, feedback,
participation, advancement, and promotion responses. Send concise per-person/cohort
progress and outcomes to Monday; retain detailed work inside GAP.

Keep application acceptance, enrollment, program completion, promotion, and joining
distinct. Preserve application-cycle and cohort history for returning people. Each
synchronized field has one authoritative owner. GAP record links in Monday require
GAP authorization and do not expose private file URLs.

This accepts the ownership direction, not a deployed integration. Form/board selection,
field mapping, sync timing, and the acceptance-to-enrollment trigger remain open.
Lead-confirmed enrollment is a recommendation awaiting a product decision.

## Consequences

Leadership can combine recruiting counts from Monday with program outcomes from GAP.
The integration requires durable identity mapping, duplicate-safe synchronization, and
visible freshness information. GAP remains usable when Monday synchronization fails.
Individual progress is limited to relevant leadership; broader reporting uses totals.
Production integration depends on the pending Supabase and authorization work.

## Alternatives considered

- Put all GAP data/files in Monday: would duplicate program workflows and detailed work.
- Put all club applicants/members in GAP: would expand the portal into a club CRM.
- Allow unrestricted two-way editing: would create conflicting progress and outcomes.
