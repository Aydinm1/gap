"use client";

import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SubmissionEditor } from "@/components/program/submission-editor";
import type { AssignmentDisplayState, SubmissionAttempt, SubmissionPayload } from "@/lib/program/types";
import {
  replaceSubmission,
  submissionDisplayName,
} from "@/lib/program/submission";
import { formatSubmissionTime } from "@/lib/program/state";

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
  initialAttempts,
  reviewPath,
}: {
  assignmentId: string;
  enrollmentId: string;
  unsubmittedState: AssignmentDisplayState;
  instructions: string;
  initialAttempts: readonly SubmissionAttempt[];
  reviewPath: string;
}) {
  const [attempts, setAttempts] = useState([...initialAttempts]);
  const [submitting, setSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const current = attempts.find((attempt) => attempt.isCurrent);
  const presentation = statusPresentation[current?.status ?? unsubmittedState];

  function submit(payload: SubmissionPayload) {
    const now = new Date().toISOString();
    setAttempts((existing) => replaceSubmission({
      attempts: existing,
      assignmentId,
      enrollmentId,
      payload,
      submittedAt: now,
      id: `mock-${crypto.randomUUID()}`,
    }));
    setSubmitting(false);
    setAnnouncement(`Submission received ${formatSubmissionTime(now)}.`);
  }

  return (
    <div>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <section className="px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10" aria-labelledby="assignment-instructions-heading">
          <h3 id="assignment-instructions-heading" className="text-sm font-bold text-ink">Instructions</h3>
          <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 text-ink-soft">{instructions}</p>
        </section>

        <aside className="border-t border-border bg-surface-subtle/70 px-6 py-7 sm:px-8 sm:py-9 lg:border-l lg:border-t-0 lg:px-8 lg:py-10" aria-labelledby="submission-status-heading">
          <p id="submission-status-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Submission</p>
          <div className="mt-3"><Badge tone={presentation.tone}>{presentation.label}</Badge></div>

          {current ? (
            <div className="mt-5">
              <p className="break-words text-sm font-bold text-ink">{submissionDisplayName(current)}</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">Submitted {formatSubmissionTime(current.submittedAt)}</p>
              {current.feedback ? <p className="mt-4 text-sm font-bold text-action">Feedback available</p> : null}
              <div className="mt-6">
                <ButtonLink href={reviewPath} className="w-full" variant={current.status === "revision_requested" ? "primary" : "secondary"}>
                  {current.feedback ? "View feedback" : "View submission"}
                </ButtonLink>
              </div>
            </div>
          ) : submitting ? (
            <div className="mt-7 border-t border-border pt-7">
              <SubmissionEditor
                actionLabel="Submit assignment"
                assignmentId={assignmentId}
                description="Choose a file or link to submit your work."
                onCancel={() => setSubmitting(false)}
                onSubmit={submit}
              />
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-ink-soft">{presentation.detail}</p>
              <div className="mt-6"><Button onClick={() => setSubmitting(true)}>Submit assignment</Button></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
