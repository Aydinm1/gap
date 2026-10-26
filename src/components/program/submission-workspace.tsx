"use client";

import { saveLink, saveText } from "@/lib/supabase/actions";

import { useRef, useState } from "react";
import { useMemberAttempts } from "./member-workspace";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SubmissionEditor } from "@/components/program/submission-editor";
import { SubmittedWorkRecord } from "@/components/program/submitted-work-record";
import type { AssignmentDisplayState, SubmissionAttempt, SubmissionPayload } from "@/lib/program/types";
import { submissionBelongsTo } from '@/lib/program/types';



const statusPresentation = {
  upcoming: { label: "Not submitted", detail: "Submit your work by the deadline.", tone: "neutral" },
  due_soon: { label: "Not submitted", detail: "This assignment is due soon.", tone: "warning" },
  overdue: { label: "Overdue", detail: "Submit your work as soon as possible.", tone: "danger" },
  submitted: { label: "Awaiting review", detail: "Submitted", tone: "info" },
  completed: { label: "Complete", detail: "You’re all set.", tone: "success" },
  revision_requested: { label: "Revision requested", detail: "Feedback available", tone: "warning" },
} satisfies Record<AssignmentDisplayState, { label: string; detail: string; tone: BadgeTone }>;

export function SubmissionWorkspace({
  assignmentId,
  enrollmentId,
  unsubmittedState,
  instructions,
  document,
  readOnly = false,
  initialAttempts,
  reviewPath,
}: {
  assignmentId: string;
  enrollmentId: string;
  unsubmittedState: AssignmentDisplayState;
  instructions?: string;
  document?: { id: string; name: string };
  readOnly?: boolean;
  initialAttempts: readonly SubmissionAttempt[];
  reviewPath: string;
}) {
  const [attempts] = useMemberAttempts(initialAttempts);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const current = attempts.find((attempt) => attempt.isCurrent && attempt.assignmentId === assignmentId && submissionBelongsTo(attempt,enrollmentId));
  const presentation = statusPresentation[current?.status ?? unsubmittedState];

  async function submit(payload: SubmissionPayload, requestId?: string) {
    if (readOnly) throw new Error('Preview only — nothing will be submitted.');
    if (payload.type === 'file') throw new Error('Use the file upload control to submit a file.');
    // This form only creates a first attempt; never silently replace a newer one.
    const result = payload.type === 'text'
      ? await saveText(assignmentId, payload.submittedText,undefined,undefined,requestId)
      : await saveLink(assignmentId, payload.submittedUrl,undefined,undefined,requestId);
    if (result.error) throw new Error(result.error);
    setSubmitting(false);
    setAnnouncement('Submission received.');
  }

  return (
    <div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {instructions ? <p className="mb-6 whitespace-pre-line text-base leading-8 text-ink-soft">{instructions}</p> : null}
      {document ? <a href={`/api/assignment-briefs/${document.id}/download`} className="mb-6 inline-flex min-h-11 items-center break-all text-sm font-bold text-action underline">Download assignment PDF · {document.name}</a> : null}

      <div>
        <section aria-label="Submission">
          <h2 className="text-xl font-bold text-ink">Your submission</h2>
          <div className="mt-3"><Badge tone={presentation.tone}>{presentation.label}</Badge></div>

          {current && !submitting && !readOnly ? (
            <div className="mt-5">
              {current.status === "revision_requested" ? (
                <p className="mb-5 text-sm leading-6 text-ink-soft">Changes were requested. Review the feedback before updating your work.</p>
              ) : null}
              <SubmittedWorkRecord attempt={current} density="compact">
                <ButtonLink href={reviewPath} className="w-full" variant={current.status === "revision_requested" ? "primary" : "secondary"}>
                  {current.feedback ? "View feedback" : "View submission"}
                </ButtonLink>
              </SubmittedWorkRecord>
            </div>
          ) : submitting ? (
            <div className="mt-7 border-t border-border pt-7">
              <SubmissionEditor
                actionLabel="Submit assignment"
                assignmentId={assignmentId}
                layout="wide"
                preview={readOnly}
                description="Write a response, upload a document, or share a link the review team can open."
                onFileSaved={() => { setSubmitting(false); setAnnouncement('Submission received.'); }}
                onCancel={() => { setSubmitting(false); requestAnimationFrame(() => actionRef.current?.focus()); }}
                onSubmit={submit}
              />
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-ink-soft">{presentation.detail}</p>
              {readOnly ? <p className="mt-3 text-sm leading-6 text-ink-soft">Preview only — nothing will be submitted.</p> : null}
              <div className="mt-6"><Button ref={actionRef} onClick={() => setSubmitting(true)}>{readOnly ? 'Preview submission' : 'Submit assignment'}</Button></div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
