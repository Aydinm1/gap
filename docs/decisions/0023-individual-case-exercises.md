# ADR 0023 — Individual case exercises

Status: Accepted (local implementation; release separately authorized)

## Decision

Add `cases` alongside Standard and Guided project workflows, restricted to Individual
assignments. Admins configure exactly eight ordered scenarios and reference approaches,
initialized from the supplied 8-Case Challenge. Configuration must be saved while the
week is unpublished and locks after the first participant save. Existing assignments
and real Week 2 content are not changed automatically.

Keep configuration, enrollment-owned runs, answers and request receipts in private
tables. User-scoped RPCs derive live participant/admin identity, project only authorized
fields and reveal each reference only after its answer is saved. No reference is part
of ordinary published assignment reads. Admin preview may read references; Viewer
practice receives scenarios/common instructions only, without real answers/references.

Case saves are editable until Finish challenge. Next acknowledges the reference and
unlocks the next case; Finish requires all eight answers and preceding acknowledgments,
then freezes the run with database time. This is completion by participation, not a
score or judgment of correctness. Responses and references remain readable afterward.

Use assignment/run locking, optimistic versions and actor-owned request receipts for
conflicts and safe retries. Never fabricate a document submission or manual completion
credit. Completion contributes to member/week progress, while case obligations are
excluded from grading queues and received-submission counts. Standard/Guided document
submission, replacement, history and grading retain their existing contracts.

## Consequences

Case content cannot be silently changed under saved answers. Future versioned exercises,
reopening finished runs, scores and automated answer evaluation need separate designs.
Protected practice previews are local-only and never invoke case mutation/upload actions.

Admin inspection uses a dedicated read-only participant/case page and case-progress filters,
reusing the existing authorized enrollment projection. It does not add grading decisions
or put exercise completions into document-submission counts.
