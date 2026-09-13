"use client";

import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmissionEditor } from "@/components/program/submission-editor";
import type { SubmissionAttempt, SubmissionPayload } from "@/lib/program/types";
import {
  canReplaceSubmission,
  replaceSubmission,
  submissionDisplayName,
} from "@/lib/program/submission";
import { formatSubmissionTime } from "@/lib/program/state";
import { cn } from "@/lib/ui";

const reviewPresentation = {
  submitted: { label: "Awaiting review", tone: "info", heading: "Submission received", detail: "Your work is with the review team. You can replace it until it has been reviewed." },
  revision_requested: { label: "Revision requested", tone: "warning", heading: "Reviewer feedback", detail: "Use this feedback to revise your submission." },
  completed: { label: "Complete", tone: "success", heading: "You’re all set", detail: "This assignment is complete." },
} satisfies Record<SubmissionAttempt["status"], { label: string; tone: BadgeTone; heading: string; detail: string }>;

function SubmissionLink({ attempt, onFileView }: { attempt: SubmissionAttempt; onFileView: () => void }) {
  const className = "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-surface-subtle";
  return attempt.payload.type === "link" ? (
    <a className={className} href={attempt.payload.submittedUrl} target="_blank" rel="noreferrer">
      View submission <span className="ml-2" aria-hidden="true">↗</span>
    </a>
  ) : (
    <button type="button" className={className} onClick={onFileView}>View submission</button>
  );
}

export function SubmissionReviewWorkspace({
  assignmentId,
  enrollmentId,
  initialAttempts,
}: {
  assignmentId: string;
  enrollmentId: string;
  initialAttempts: readonly SubmissionAttempt[];
}) {
  const [attempts, setAttempts] = useState([...initialAttempts]);
  const [replacing, setReplacing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const current = attempts.find((attempt) => attempt.isCurrent);

  if (!current) return null;

  const previous = attempts.filter((attempt) => !attempt.isCurrent);
  const presentation = reviewPresentation[current.status];
  const reviewHeading = current.feedback ? "Reviewer feedback" : presentation.heading;
  const replacementAllowed = canReplaceSubmission(current);
  const actionLabel = current.status === "revision_requested" ? "Revise submission" : "Replace submission";

  function submit(payload: SubmissionPayload) {
    if (!replacementAllowed) return;
    const now = new Date().toISOString();
    setAttempts((existing) => replaceSubmission({
      attempts: existing,
      assignmentId,
      enrollmentId,
      payload,
      submittedAt: now,
      id: `mock-${crypto.randomUUID()}`,
    }));
    setReplacing(false);
    setAnnouncement(`Submission received ${formatSubmissionTime(now)}.`);
  }

  return (
    <div>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <section className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12" aria-labelledby="review-heading">
          <Badge tone={presentation.tone}>{presentation.label}</Badge>
          {current.reviewedAt ? <p className="mt-3 text-sm text-ink-soft">Reviewed {formatSubmissionTime(current.reviewedAt)}</p> : null}
          <h2 id="review-heading" className={cn(
            "mt-6 font-bold tracking-[-0.025em] text-ink",
            current.feedback ? "text-2xl" : "text-xl",
          )}>{reviewHeading}</h2>
          {current.feedback ? (
            <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-ink">{current.feedback}</p>
          ) : (
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">{presentation.detail}</p>
          )}
          {current.feedback ? <p className="mt-6 text-sm leading-6 text-ink-soft">{presentation.detail}</p> : null}
        </section>

        <aside className="border-t border-border bg-surface-subtle/70 px-6 py-7 sm:px-8 sm:py-9 lg:border-l lg:border-t-0 lg:px-8 lg:py-10" aria-label="Submitted work">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">Submitted work</p>
            <p className="mt-3 break-words text-sm font-bold text-ink">{submissionDisplayName(current)}</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">Submitted {formatSubmissionTime(current.submittedAt)}</p>
            <div className={cn("mt-5 grid gap-2", replacementAllowed && !replacing && "xl:grid-cols-2")}>
              <SubmissionLink
                attempt={current}
                onFileView={() => setAnnouncement("Private file preview will be available after Supabase Storage is connected.")}
              />
              {replacementAllowed && !replacing ? (
                <Button className="w-full" size="compact" variant={current.status === "revision_requested" ? "primary" : "secondary"} onClick={() => setReplacing(true)}>
                  {actionLabel}
                </Button>
              ) : null}
            </div>
          </div>

          {replacing ? (
            <div className="mt-7 border-t border-border pt-7">
              <SubmissionEditor
                actionLabel={actionLabel}
                assignmentId={assignmentId}
                description="Choose one submission method. Your previous attempt remains in history."
                onCancel={() => setReplacing(false)}
                onSubmit={submit}
              />
            </div>
          ) : null}
        </aside>
      </div>

      {previous.length ? (
        <section className="border-t border-border px-6 py-8 sm:px-8 lg:px-10" aria-labelledby="submission-history-heading">
          <h2 id="submission-history-heading" className="text-sm font-bold text-ink">Previous submissions</h2>
          <ol className="mt-5 max-w-3xl border-l border-border pl-5">
            {previous.map((attempt) => (
              <li key={attempt.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[1.47rem] top-1 size-2.5 rounded-full border-2 border-surface bg-border-strong" aria-hidden="true" />
                <p className="break-words text-sm font-bold text-ink">{submissionDisplayName(attempt)}</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{formatSubmissionTime(attempt.submittedAt)} · {reviewPresentation[attempt.status].label}</p>
                {attempt.feedback ? <p className="mt-2 text-sm leading-6 text-ink-soft">{attempt.feedback}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
