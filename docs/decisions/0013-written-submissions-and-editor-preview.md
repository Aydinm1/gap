# ADR 0013: Plain-text attempts and non-mutating editor preview

- **Status:** Accepted
- **Date:** 2026-10-21
- **Amends:** [ADR 0011](0011-read-only-admin-preview.md)

## Context

Members need to type SWOT analyses without preparing a document. Admins need to inspect
submission controls without enrolling or submitting real work.

## Decision

Add a third, mutually exclusive text payload to retained submission attempts, limited
to 20,000 Unicode characters and rendered as escaped plain text. Use an authorized
transactional RPC with existing enrollment locks, current-attempt version checks,
completion restrictions and historical retention. Commit the enum addition separately
before using it. Keep file/link behavior and Storage unchanged.

Extend admin preview with the shared editor in explicit preview mode. Inputs operate
locally outside member drafts; submission/upload handlers are guarded and saving is
disabled. No simulation is saved or sent to Storage.

## Consequences

All methods share review/completion rules and replace one another. No rich text,
autosave, text downloads, impersonation or assignment-specific method restrictions.
Preview drafts disappear on unmount/reload; member drafts remain session-local.
Hosted migration and deployment require separate release authorization.
