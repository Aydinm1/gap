# Architecture Decision Records

**Status:** Active
**Last updated:** 2026-09-14
**Source of truth for:** Durable decision history and ADR format

Create an ADR for decisions that materially affect architecture, schema, security,
authorization, external contracts, or major product behavior and would be costly to
reverse. Routine components, styling adjustments, and obvious implementation details do
not need ADRs.

## Naming

- [0008 — Manual accepted-member intake](0008-monday-member-import.md)

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

## Accepted decisions

- [ADR 0009: Private upload lifecycle](0009-private-upload-lifecycle.md)

- [ADR 0001: Documentation as product infrastructure](0001-documentation-as-product-infrastructure.md)
- [ADR 0002: Stable runtime and framework channels](0002-stable-runtime-and-framework-channels.md)
- [ADR 0003: Cohort history and advancement outcomes](0003-cohort-history-and-advancement-outcomes.md)
- [ADR 0004: Monday recruiting and GAP reporting](0004-monday-recruiting-and-gap-reporting.md)
- [ADR 0005: Explicit GAP enrollment approval](0005-explicit-gap-enrollment.md)
- [ADR 0006: Monday-ready enrollment foundation](0006-monday-ready-enrollment-foundation.md)
- [ADR 0007: Bring authentication into P5](0007-authentication-in-p5.md)
