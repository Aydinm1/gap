import type {
  AssignmentDisplayState,
  CohortEnrollment,
  ProgramCohort,
  ProgramUser,
  ProgramWeek,
  SubmissionAttempt,
} from "./types.ts";
import { assignmentsForWeek, isPublishedWeek } from "./types.ts";
import {
  countCompletedModules,
  deriveAssignmentState,
  findCurrentActionableWeek,
  findNearestActionableAssignment,
  formatDeadline,
  formatCohortLabel,
} from "./state.ts";

export type ModulePresentationState =
  | "complete"
  | "current"
  | "available"
  | "locked";

export type DashboardModule = {
  id: string;
  weekNumber: number;
  title: string;
  state: ModulePresentationState;
  href?: string;
  assignmentState?: AssignmentDisplayState;
  completedAssignments?: number;
  totalAssignments?: number;
};

export type ProgramDashboardViewModel = {
  user: ProgramUser;
  term: string;
  currentWeekNumber?: number;
  completedModules: number;
  totalModules: number;
  continueLearning?: {
    weekNumber: number;
    title: string;
    description: string;
    href: string;
  };
  priorityAssignment?: {
    weekNumber: number;
    actionLabel: string;
    actionHref: string;
    title: string;
    dueLabel: string;
    state: AssignmentDisplayState;
    href: string;
    feedback?: string;
  };
  modules: readonly DashboardModule[];
};

export function buildProgramDashboard({
  user,
  cohort,
  enrollment,
  weeks,
  submissions,
  now,
}: {
  user: ProgramUser;
  cohort: ProgramCohort;
  enrollment: CohortEnrollment;
  weeks: readonly ProgramWeek[];
  submissions: readonly SubmissionAttempt[];
  now: Date;
}): ProgramDashboardViewModel {
  if (user.personId !== enrollment.personId || cohort.id !== enrollment.cohortId) {
    throw new Error("Dashboard cohort context does not match the current enrollment.");
  }
  const cohortWeeks = weeks.filter((week) => week.cohortId === cohort.id);
  const currentSubmissions = submissions.filter(
    (submission) =>
      submission.isCurrent && submission.enrollmentId === enrollment.id,
  );
  const submissionsByAssignment = new Map(
    currentSubmissions.map((submission) => [submission.assignmentId, submission]),
  );
  const currentWeek = findCurrentActionableWeek(cohortWeeks, submissionsByAssignment);
  const priorityAssignment = findNearestActionableAssignment(
    cohortWeeks,
    submissionsByAssignment,
  );
  const prioritySubmission = priorityAssignment
    ? submissionsByAssignment.get(priorityAssignment.id)
    : undefined;

  const modules = cohortWeeks
    .toSorted((a, b) => a.weekNumber - b.weekNumber)
    .map<DashboardModule>((week) => {
      if (!isPublishedWeek(week)) {
        return {
          id: week.id,
          weekNumber: week.weekNumber,
          title: week.title,
          state: "locked",
        };
      }

      const assignments = assignmentsForWeek(week);
      const completedAssignments = assignments.filter((item) => submissionsByAssignment.get(item.id)?.status === "completed").length;
      const complete = assignments.length > 0 && completedAssignments === assignments.length;
      const states = assignments.map((item) => deriveAssignmentState(item, submissionsByAssignment.get(item.id), now));
      const assignmentState = complete ? "completed" : (["revision_requested", "overdue", "due_soon", "upcoming", "submitted"] as const).find((state) => states.includes(state));

      return {
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        state: complete
          ? "complete"
          : week.id === currentWeek?.id
            ? "current"
            : "available",
        href: `/week/${week.weekNumber}`,
        assignmentState,
        completedAssignments,
        totalAssignments: assignments.length,
      };
    });

  return {
    user,
    term: formatCohortLabel(cohort),
    currentWeekNumber: currentWeek?.weekNumber,
    completedModules: countCompletedModules(currentSubmissions, cohortWeeks),
    totalModules: cohortWeeks.length,
    continueLearning: currentWeek
      ? {
          weekNumber: currentWeek.weekNumber,
          title: currentWeek.title,
          description: currentWeek.description,
          href: `/week/${currentWeek.weekNumber}`,
        }
      : undefined,
    priorityAssignment: priorityAssignment
      ? {
          weekNumber: priorityAssignment.weekNumber,
          actionLabel: prioritySubmission?.status === "revision_requested" ? "View feedback" : prioritySubmission ? "View submission" : "View assignment",
          actionHref: prioritySubmission ? `/week/${priorityAssignment.weekNumber}/submission?assignment=${encodeURIComponent(priorityAssignment.id)}` : `/week/${priorityAssignment.weekNumber}#assignment-${priorityAssignment.id}`,
          title: priorityAssignment.title,
          dueLabel: formatDeadline(priorityAssignment.dueAt),
          state: deriveAssignmentState(
            priorityAssignment,
            prioritySubmission,
            now,
          ),
          href: `/week/${priorityAssignment.weekNumber}`,
          feedback: prioritySubmission?.feedback,
        }
      : undefined,
    modules,
  };
}
