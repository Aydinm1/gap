import type {
  AssignmentDisplayState,
  ProgramWeek,
  Resource,
  SubmissionAttempt,
} from "./types.ts";
import { findPublishedWeek } from "./catalog.ts";
import { assignmentsForWeek } from "./types.ts";
import {
  deriveAssignmentState,
  formatDeadline,
  formatSubmissionTime,
} from "./state.ts";

export type AssignmentDetail = {
    id: string;
    title: string;
    instructions: string;
    document?: { id: string; name: string };
    dueLabel: string;
    state: AssignmentDisplayState;
    unsubmittedState: AssignmentDisplayState;
    attempts: readonly SubmissionAttempt[];
    submittedLabels: Readonly<Record<string, string>>;
};

export type WeekDetailViewModel = {
  week: {
    id: string;
    weekNumber: number;
    title: string;
    description: string;
    slidesUrl?: string;
    resources: readonly Resource[];
  };
  assignments: readonly AssignmentDetail[];
  assignment?: AssignmentDetail;
};

export function buildWeekDetail({
  weeks,
  weekNumber,
  cohortId,
  enrollmentId,
  submissions,
  now,
}: {
  weeks: readonly ProgramWeek[];
  weekNumber: string;
  cohortId: string;
  enrollmentId: string;
  submissions: readonly SubmissionAttempt[];
  now: Date;
}): WeekDetailViewModel | undefined {
  const cohortWeeks = weeks.filter((week) => week.cohortId === cohortId);
  const week = findPublishedWeek(cohortWeeks, weekNumber);
  if (!week) return undefined;

  const resources = week.resources.toSorted(
    (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
  );
  const assignments = assignmentsForWeek(week).map((assignment): AssignmentDetail => {
  const attempts = submissions
    .filter(
      (attempt) =>
        attempt.assignmentId === assignment.id &&
        attempt.enrollmentId === enrollmentId,
    )
    .toSorted(
      (left, right) =>
        Number(right.isCurrent) - Number(left.isCurrent) ||
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    );
  const current = attempts.find((attempt) => attempt.isCurrent);

  return {
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      document: assignment.document,
      dueLabel: formatDeadline(assignment.dueAt),
      state: deriveAssignmentState(assignment, current, now),
      unsubmittedState: deriveAssignmentState(assignment, undefined, now),
      attempts,
      submittedLabels: Object.fromEntries(
        attempts.map((attempt) => [attempt.id, formatSubmissionTime(attempt.submittedAt)]),
      ),
  };
  });
  return {
    week: { id: week.id, weekNumber: week.weekNumber, title: week.title, description: week.description, slidesUrl: week.slidesUrl, resources },
    assignments,
    assignment: assignments[0],
  };
}
