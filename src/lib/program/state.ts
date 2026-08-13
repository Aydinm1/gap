import type {
  Assignment,
  AssignmentDisplayState,
  ProgramWeek,
  PublishedWeek,
  SubmissionAttempt,
} from "./types.ts";
import { isPublishedWeek } from "./types.ts";

export const DUE_SOON_WINDOW_MS = 72 * 60 * 60 * 1000;
export const PROGRAM_TIME_ZONE = "America/Los_Angeles";

export function deriveAssignmentState(
  assignment: Assignment,
  submission: SubmissionAttempt | undefined,
  now: Date,
): AssignmentDisplayState {
  if (submission?.status === "needs_revision") return "needs_revision";
  if (submission?.status === "reviewed") return "reviewed";
  if (submission?.status === "submitted") return "submitted";

  const timeRemaining = new Date(assignment.dueAt).getTime() - now.getTime();
  if (timeRemaining < 0) return "overdue";
  if (timeRemaining <= DUE_SOON_WINDOW_MS) return "due_soon";
  return "upcoming";
}

export function isModuleComplete(submission: SubmissionAttempt | undefined) {
  return submission?.status === "submitted" || submission?.status === "reviewed";
}

export function countCompletedModules(submissions: readonly SubmissionAttempt[]) {
  return new Set(
    submissions
      .filter((submission) => submission.isCurrent && isModuleComplete(submission))
      .map((submission) => submission.assignmentId),
  ).size;
}

export function findCurrentActionableWeek(
  weeks: readonly ProgramWeek[],
  submissionsByAssignment: ReadonlyMap<string, SubmissionAttempt>,
): PublishedWeek | undefined {
  return weeks.find((week): week is PublishedWeek => {
    if (!isPublishedWeek(week)) return false;
    if (!week.assignment) return true;
    return !isModuleComplete(submissionsByAssignment.get(week.assignment.id));
  });
}

export function findNearestActionableAssignment(
  weeks: readonly ProgramWeek[],
  submissionsByAssignment: ReadonlyMap<string, SubmissionAttempt>,
): Assignment | undefined {
  let nearest: Assignment | undefined;

  for (const week of weeks) {
    if (!isPublishedWeek(week) || !week.assignment) continue;
    const submission = submissionsByAssignment.get(week.assignment.id);
    if (submission?.status === "reviewed") continue;
    if (!nearest || week.assignment.dueAt < nearest.dueAt) nearest = week.assignment;
  }

  return nearest;
}

export function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatSubmissionTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
