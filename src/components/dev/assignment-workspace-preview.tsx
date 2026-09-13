"use client";

import { useState } from "react";
import { MemberWorkspace } from "@/components/program/member-workspace";
import { SubmissionReviewWorkspace } from "@/components/program/submission-review-workspace";
import { SubmissionWorkspace } from "@/components/program/submission-workspace";
import { Card } from "@/components/ui/card";
import { mockEnrollments, mockSubmissions, researchPlanAssignment } from "@/lib/program/mock-data";
import {
  buildAssignmentPreviewAttempts,
  type AssignmentPreviewState,
} from "@/lib/program/submission";

const previewOptions: readonly { value: AssignmentPreviewState; label: string }[] = [
  { value: "first_visit", label: "First visit" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "completed", label: "Complete" },
];

export function AssignmentWorkspacePreview() {
  const [previewState, setPreviewState] = useState<AssignmentPreviewState>("first_visit");
  const enrollmentId = mockEnrollments[0].id;
  const seededAttempts = mockSubmissions.filter(
    (attempt) => attempt.assignmentId === researchPlanAssignment.id,
  );
  const attempts = buildAssignmentPreviewAttempts({
    attempts: seededAttempts,
    previewState,
    assignmentId: researchPlanAssignment.id,
    enrollmentId,
  });

  return (
    <div className="mt-6 space-y-6">
      <fieldset className="rounded-lg border border-border bg-info-bg/50 px-5 py-4">
        <legend className="sr-only">Preview assignment state</legend>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-info-text">
            Preview state
          </p>
          <div className="flex flex-wrap gap-2">
            {previewOptions.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="assignment-preview-state"
                  checked={previewState === option.value}
                  onChange={() => setPreviewState(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-bold text-ink-soft transition-colors peer-checked:border-action peer-checked:bg-action peer-checked:text-white">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <MemberWorkspace initialAttempts={attempts} key={previewState}>
      <Card className="overflow-hidden" key={`week-${previewState}`}>
        <div className="border-b border-border px-6 py-6 sm:px-8 lg:px-10 lg:py-8">
          <h3 className="text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
            {researchPlanAssignment.title}
          </h3>
        </div>
        <SubmissionWorkspace
          assignmentId={researchPlanAssignment.id}
          enrollmentId={enrollmentId}
          unsubmittedState="due_soon"
          instructions={researchPlanAssignment.instructions}
          initialAttempts={attempts}
          reviewPath="#assignment-review-preview"
        />
      </Card>

      {previewState !== "first_visit" ? (
        <div id="assignment-review-preview">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">
            Submission review page
          </p>
          <Card className="mt-3 overflow-hidden" key={`review-${previewState}`}>
            <SubmissionReviewWorkspace
              assignmentId={researchPlanAssignment.id}
              enrollmentId={enrollmentId}
              initialAttempts={attempts}
            />
          </Card>
        </div>
      ) : null}
      </MemberWorkspace>
    </div>
  );
}
