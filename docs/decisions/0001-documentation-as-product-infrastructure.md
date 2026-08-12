# ADR 0001: Treat documentation as product infrastructure

- **Status:** Accepted
- **Date:** 2026-08-12
- **Supersedes:** None
- **Superseded by:** None

## Context

GAP will be built primarily through repeated AI-assisted changes. A single large prompt or
TODO cannot reliably preserve the distinction between current behavior, planned work,
historical reasoning, and unapproved ideas. Inconsistent context would lead to schema,
security, design, and product drift.

## Decision

Maintain lightweight structured documentation with:

- living source-of-truth documents by decision domain;
- `todo.md` as the approved execution tracker;
- `CHANGELOG.md` as the meaningful change history;
- ADRs only for durable, costly-to-reverse decisions;
- explicit agent instructions requiring documentation and implementation to change
  together.

## Consequences

Every meaningful change has a small documentation cost, but future contributors and AI
agents gain a reliable reading order and clear decision authority. Documentation drift is
treated as incomplete work. Routine implementation choices avoid unnecessary ADR
overhead.

## Alternatives considered

- **One comprehensive TODO:** simple initially, but mixes requirements, progress, and
  rationale and becomes difficult to keep authoritative.
- **ADR for every decision:** maximizes traceability but creates excessive maintenance and
  obscures consequential decisions.
- **Code as the only source of truth:** cannot adequately preserve unimplemented approved
  requirements, operating procedures, or decision rationale.
