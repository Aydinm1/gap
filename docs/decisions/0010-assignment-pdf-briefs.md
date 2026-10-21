# ADR 0010: Separate private assignment briefs from member submissions

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Admins need to upload PDF assignment briefs directly while members continue to submit
their own work. A brief's audience follows week publication and cohort enrollment;
a member submission follows owner/reviewer access and retained attempt history.

## Decision

Use a separate private `assignment-briefs` bucket and RLS-protected document table.
Reserve exact unique paths with live admin authority, upload directly with TUS, inspect
PDF bytes on the server, and commit through a service-only function. Serialize per
assignment and compare the prior attachment ID before changing the current brief.
Download by document ID through an authenticated attachment route. Keep prior objects
for admins; members access only the current published brief. Upload saves independently
from text edits and the editor states that explicitly.

## Consequences

No submission ownership or completion rules need to change. Drafts remain private and
retired briefs cannot leak through guessed paths. Replacements retain stored objects;
abandoned/expired object cleanup needs an operational follow-up. PDF signature checks
do not provide malware scanning. Hosted migration and browser acceptance are tracked
separately from local implementation.

## Alternatives considered

Reusing the submissions bucket would conflate different audiences and histories.
Public URLs would weaken draft privacy. Drive links remain usable as resources but do
not satisfy the requested direct upload flow.
