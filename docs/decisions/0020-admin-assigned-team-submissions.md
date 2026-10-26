# ADR 0020: Admin-assigned teams and shared submission targets

Date: 2026-10-25
Status: Accepted; implemented locally

## Decision

Admins alone create cohort teams and choose members. Members cannot create, choose,
join, leave or edit teams. One enrollment belongs to at most one cohort team. Teams
cannot mix official/test enrollments. Membership locks on the first committed team
submission; naming remains editable. Historical corrections are deferred.

Assignments default to Individual and can opt into Team only before submission/upload
history. Existing work stays individual. A stable assignment/owner target is owned by
one enrollment or one team. Attempts retain their actual submitter separately; no copies
are created per teammate. Team approval satisfies the assignment for its teammates.

Team edits, target creation, saves, finalization, review and mode changes share a
transaction advisory gate, then row locks. For this small program a single gate keeps
lock order auditable, including first-save races. Upload cleanup only locks intents and
cannot reenter the gate. This is serialization, not a UI lease or real-time collaboration.
Text/link request receipts distinguish retries from intentional replacements. Uploads
capture membership version and cannot commit after team membership changes.

Live verified roster authorization remains mandatory. Team reads require current
enrolled participation in the active cohort; no directory or outsider submission access
is added. Individual historical access remains unchanged. Admin preview stays non-saving.

## Consequences

Existing individual targets are backfilled without changing attempt IDs or payloads.
Queues count team-assignment work once, while personal completion derives shared approval.
Attendance/outcomes stay individual. Locked teams cannot be deleted or rearranged in v1.
No recruitment/Monday sync, self-service team selection or hosted release is implied.
