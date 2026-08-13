# ADR 0003: Cohort history and advancement outcomes

- **Status:** Accepted
- **Date:** 2026-08-13
- **Supersedes:** None
- **Superseded by:** None

## Context

GAP may run during Fall, Winter, or Spring quarters. The application must preserve a
participant's history after access ends and distinguish people who were not promoted from
people who were promoted but declined the full program.

The original single-term model combined access, identity, and program membership and made
week numbers globally unique. That cannot represent multiple cohorts safely.

## Decision

Separate permanent people, login authorization, authenticated profiles, cohorts, and
cohort enrollments. Associate content and work with a cohort. Track participation,
advancement decision, and promoted response separately.

Support `fall`, `winter`, and `spring`, labeled with calendar years. Retain every formal
enrollment as a cohort starter. Admin reporting uses transparent counts plus advancement,
offer-yield, and end-to-end conversion rates.

## Consequences

- Deactivating access does not erase participant history.
- One person may participate in multiple cohorts.
- Week numbers repeat across cohorts but remain unique within one cohort.
- GAP stores only GAP participants/admins and movement into the full program; it is not the
  full club directory.

## Alternatives considered

- Adding a cohort string to the access roster would still conflate historical participation
  with current authorization.
- One final-outcome enum would obscure the difference between not promoted and promoted
  but declined.
