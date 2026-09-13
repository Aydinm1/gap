import type {
  SubmissionAttempt,
  SubmissionPayload,
  SubmissionStatus,
} from "./types.ts";

export const MAX_SUBMISSION_BYTES = 20 * 1024 * 1024;

const allowedExtensions = new Set(["pdf", "docx", "pptx", "xlsx"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type FileDescriptor = { name: string; size: number; type: string };
export type AssignmentPreviewState =
  | "first_visit"
  | "awaiting_review"
  | "revision_requested"
  | "completed";

export function getAssignmentWorkspaceMode(attempts: readonly SubmissionAttempt[]) {
  return attempts.some((attempt) => attempt.isCurrent) ? "review" : "prepare";
}

export function canReplaceSubmission(attempt: SubmissionAttempt | undefined) {
  return attempt?.status !== "completed";
}

export function getDefaultAssignmentPreviewState(
  attempts: readonly SubmissionAttempt[],
): AssignmentPreviewState {
  const current = attempts.find((attempt) => attempt.isCurrent);
  if (!current) return "first_visit";
  if (current.status === "submitted") return "awaiting_review";
  if (current.status === "completed") return "completed";
  return "revision_requested";
}

export function buildAssignmentPreviewAttempts({
  attempts,
  previewState,
  assignmentId,
  enrollmentId,
}: {
  attempts: readonly SubmissionAttempt[];
  previewState: AssignmentPreviewState;
  assignmentId: string;
  enrollmentId: string;
}) {
  if (previewState === "first_visit") return [];

  const base = attempts.find((attempt) => attempt.isCurrent) ?? attempts[0];
  const payload = base?.payload ?? {
    type: "link" as const,
    submittedUrl: "https://example.com/submission-preview",
  };
  const current: SubmissionAttempt = {
    ...(base ?? {
      id: "preview-submission",
      submittedAt: "2026-09-16T03:43:00.000Z",
    }),
    id: `${base?.id ?? "submission"}-preview-${previewState}`,
    assignmentId,
    enrollmentId,
    payload,
    isCurrent: true,
    status:
      previewState === "awaiting_review"
        ? "submitted"
        : previewState === "completed"
          ? "completed"
          : "revision_requested",
    feedback:
      previewState === "awaiting_review"
        ? undefined
        : previewState === "completed"
          ? "Strong structure and source selection. You’re all set for this assignment."
          : base?.feedback ??
            "Clarify the issue areas, make them mutually exclusive, and add a source for sizing each branch.",
    reviewedAt:
      previewState === "awaiting_review"
        ? undefined
        : base?.reviewedAt ?? "2026-09-16T17:20:00.000Z",
    reviewedByUserId:
      previewState === "awaiting_review"
        ? undefined
        : base?.reviewedByUserId ?? "user-admin-preview",
  };
  const history = attempts
    .filter((attempt) => !attempt.isCurrent)
    .map((attempt) => ({ ...attempt, isCurrent: false }));
  return [current, ...history];
}

export function validateSubmissionFile(file: FileDescriptor | undefined) {
  if (!file) return "Choose a file.";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) {
    return "Choose a PDF, DOCX, PPTX, or XLSX file.";
  }
  if (file.type && !allowedMimeTypes.has(file.type)) {
    return "Choose a PDF, DOCX, PPTX, or XLSX file.";
  }
  if (file.size > MAX_SUBMISSION_BYTES) return "File must be 20 MB or smaller.";
  return undefined;
}

export function validateReviewFeedback(
  status: Exclude<SubmissionStatus, "submitted">,
  feedback: string | undefined,
) {
  if (status === "revision_requested" && !feedback?.trim()) {
    return "Add feedback before requesting a revision.";
  }
  return undefined;
}

export function normalizeSubmissionUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { error: "Enter a link." } as const;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Enter a valid link." } as const;
    }
    return { value: url.toString() } as const;
  } catch {
    return { error: "Enter a valid link." } as const;
  }
}

export function replaceSubmission({
  attempts,
  assignmentId,
  enrollmentId,
  payload,
  submittedAt,
  id,
}: {
  attempts: readonly SubmissionAttempt[];
  assignmentId: string;
  enrollmentId: string;
  payload: SubmissionPayload;
  submittedAt: string;
  id: string;
}) {
  const previousCurrent = attempts.find((attempt) => attempt.isCurrent);
  const history = attempts.map((attempt) =>
    attempt.isCurrent ? { ...attempt, isCurrent: false } : attempt,
  );
  const next: SubmissionAttempt = {
    id,
    assignmentId,
    enrollmentId,
    payload,
    submittedAt,
    status: "submitted",
    isCurrent: true,
    supersedesSubmissionId: previousCurrent?.id,
  };
  return [next, ...history];
}

export function submissionDisplayName(attempt: SubmissionAttempt) {
  return attempt.payload.type === "file"
    ? attempt.payload.originalFilename
    : attempt.payload.submittedUrl;
}
