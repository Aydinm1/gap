# ADR 0006: Monday-ready enrollment foundation

- **Status:** Accepted
- **Date:** 2026-09-14
- **Supersedes:** None; implements the database boundary in ADRs 0004 and 0005
- **Superseded by:** None

## Context

GAP needs stable application links and safe enrollment before a Monday board is configured.
The portal still has mock authentication and no prior database migrations. Connecting an
enrollment action to that mock would grant access without a real authorization boundary.

## Decision

Create the minimal people/roster/cohort/enrollment foundation, not the full P5 schema.
Store Monday account/board/item text identifiers in a private table uniquely linked by
that triple to an enrollment. Multiple applications may share an enrollment, and repeat
cohort participation remains separate. Do not duplicate person/cohort data in mappings.

Provide a private SQL enrollment function executable only by trusted server credentials.
Do not expose it as a public RPC or connect it to the mock UI. The future server adapter
must verify admin authority or accepted-applicant checkbox approval before calling.

Provision person, member access, enrollment, and optional mapping in one transaction.
Resolve a mapping first, otherwise match normalized email. Reject conflicts and inactive
access; preserve existing roles, names, and outcomes. Serialize this low-volume operation
with a transaction advisory lock and retain unique constraints for other database writers.
Keep current browser access denied until the remaining P5/P7 authorization work lands.

## Consequences

Database tests need no live Monday account. Enrollment can be reused by future trusted
callers without duplicating business rules. This adds no public endpoint or production
credentials. Live Auth, admin policies, client wiring, checkbox status reporting, and
synchronization remain separate gates. The private schema must not be exposed in PostgREST.

## Alternatives considered

- Put a Monday ID on each person: loses application-cycle and cohort distinctions.
- Provision through separate client writes: risks partial access and duplicate enrollments.
- Expose an authenticated RPC now: premature while real admin authorization is unfinished.
- Implement all P5 tables first: unnecessarily expands this enrollment-only change.

## References

- [PostgreSQL function privileges and security](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL transaction advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html)
