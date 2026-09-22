# ADR 0007: Bring authentication into P5

- **Status:** Accepted
- **Date:** 2026-09-20
- **Supersedes:** None
- **Superseded by:** None

## Context

Persistent member submissions and admin writes cannot safely use the P4 mock identity.
Waiting until P7 for authentication would leave P5 without a meaningful authorization gate.

## Decision

Bring cookie-aware Supabase Google sign-in, live roster authorization, profile sync,
protected reads, and mutation authorization into P5. Use local Supabase first. Require
a confirmed UC Davis Google identity and active approved roster membership; profiles and
editable metadata cannot grant authority. Ordinary operations use user-scoped clients.

Link submissions are P5. Private Storage remains P6. Real Google configuration and
verified sign-in remain explicit acceptance requirements, separate from fixture-session
tests. Hosted deployment and Monday connectivity remain separate work.

## Consequences

Missing configuration must fail visibly, with no mock-auth fallback. Database policies
and server boundaries must independently enforce access. P5 stays incomplete until local
authenticated workflows and authorization tests pass; fixture sessions do not prove OAuth.

## Alternatives considered

Keeping mock admin identity during persistence was rejected because it would expose real
records without verified authority. Moving Storage and Monday into P5 was rejected as an
unnecessary scope expansion.
