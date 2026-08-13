import type {
  AdvancementStatus,
  CohortEnrollment,
  ProgramCohort,
  PromotionResponse,
} from "./types.ts";

export function enrollmentLifecycle(
  cohort: Pick<ProgramCohort, "state">,
  enrollment: Pick<CohortEnrollment, "participationStatus">,
) {
  return cohort.state === "active" && enrollment.participationStatus === "enrolled"
    ? "active"
    : "past";
}

export function isValidOutcomeCombination({
  advancementStatus,
  promotionResponse,
}: {
  advancementStatus: AdvancementStatus;
  promotionResponse?: PromotionResponse;
}) {
  return advancementStatus === "promoted"
    ? promotionResponse !== undefined
    : promotionResponse === undefined;
}

export function cohortIdentity(cohort: Pick<ProgramCohort, "quarter" | "year">) {
  return `${cohort.year}:${cohort.quarter}`;
}

export function hasDuplicateCohortIdentity(
  cohorts: readonly Pick<ProgramCohort, "quarter" | "year">[],
) {
  const identities = cohorts.map(cohortIdentity);
  return new Set(identities).size !== identities.length;
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

export function hasDuplicateEnrollment(
  enrollments: readonly { cohortId: string; personId: string }[],
) {
  return hasDuplicates(
    enrollments.map((enrollment) =>
      `${enrollment.cohortId}:${enrollment.personId}`,
    ),
  );
}

export function hasDuplicateWeekNumber(
  weeks: readonly { cohortId: string; weekNumber: number }[],
) {
  return hasDuplicates(
    weeks.map((week) => `${week.cohortId}:${week.weekNumber}`),
  );
}
