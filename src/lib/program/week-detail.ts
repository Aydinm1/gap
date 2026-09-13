import type {
  AssignmentDisplayState,
  ProgramWeek,
  Resource,
  SubmissionAttempt,
} from "./types.ts";
import { findPublishedWeek } from "./catalog.ts";
import {
  deriveAssignmentState,
  formatDeadline,
  formatSubmissionTime,
} from "./state.ts";

export type WeekDetailViewModel = {
  week: {
    id: string;
    weekNumber: number;
    title: string;
    description: string;
    slidesUrl?: string;
    resources: readonly Resource[];
  };
  assignment?: {
    id: string;
    title: string;
    instructions: string;
    dueLabel: string;
    state: AssignmentDisplayState;
    unsubmittedState: AssignmentDisplayState;
    attempts: readonly SubmissionAttempt[];
    submittedLabels: Readonly<Record<string, string>>;
  };
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
  if (!week.assignment) {
    return {
      week: {
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        description: week.description,
        slidesUrl: week.slidesUrl,
        resources,
      },
    };
  }

  const attempts = submissions
    .filter(
      (attempt) =>
        attempt.assignmentId === week.assignment?.id &&
        attempt.enrollmentId === enrollmentId,
    )
    .toSorted(
      (left, right) =>
        Number(right.isCurrent) - Number(left.isCurrent) ||
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    );
  const current = attempts.find((attempt) => attempt.isCurrent);

  return {
    week: {
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      slidesUrl: week.slidesUrl,
      resources,
    },
    assignment: {
      id: week.assignment.id,
      title: week.assignment.title,
      instructions: week.assignment.instructions,
      dueLabel: formatDeadline(week.assignment.dueAt),
      state: deriveAssignmentState(week.assignment, current, now),
      unsubmittedState: deriveAssignmentState(week.assignment, undefined, now),
      attempts,
      submittedLabels: Object.fromEntries(
        attempts.map((attempt) => [attempt.id, formatSubmissionTime(attempt.submittedAt)]),
      ),
    },
  };
}
