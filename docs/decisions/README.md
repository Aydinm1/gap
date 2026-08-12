# Architecture Decision Records

**Status:** Active
**Last updated:** 2026-08-12
**Source of truth for:** Durable decision history and ADR format

Create an ADR for decisions that materially affect architecture, schema, security,
authorization, external contracts, or major product behavior and would be costly to
reverse. Routine components, styling adjustments, and obvious implementation details do
not need ADRs.

## Naming

Use sequential filenames:

```text
0001-short-decision-title.md
0002-next-decision.md
```

Never reuse a number. Supersede an ADR instead of rewriting its historical decision.

## Template

```markdown
# ADR NNNN: Decision title

- **Status:** Proposed | Accepted | Superseded | Rejected
- **Date:** YYYY-MM-DD
- **Supersedes:** ADR link or None
- **Superseded by:** ADR link or None

## Context

What problem or constraint requires a durable decision?

## Decision

What has been decided? State the rule precisely.

## Consequences

What becomes easier, harder, required, or intentionally unsupported?

## Alternatives considered

Which credible alternatives were rejected, and why?
```

Living documents must reflect the current accepted result. ADRs explain the reasoning but
do not override a later source-of-truth update and superseding ADR.
