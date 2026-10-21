# ADR 0011: Read-only member preview without enrollment

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Admins need to inspect published member content without adding themselves to participant
counts or viewing/altering a real learner's submission state.

## Decision

Provide live-admin-authorized preview routes for the selected cohort. Map published
content and draft catalog fields into the shared member dashboard/week view models,
using a display-only enrollment context and empty attempts. Render a persistent preview
banner and disable submission controls. Keep downloads under existing admin authority.
Do not persist preview context, impersonate learners, or weaken member enrollment checks.

## Consequences

Preview works for unenrolled admins and never changes outcome metrics. It shows the
initial member state, not an individual learner's progress. Drafts remain locked;
draft/archived cohorts display an access warning. No schema migration is required.
