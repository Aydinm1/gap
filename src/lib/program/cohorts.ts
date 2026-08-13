import type { CohortEnrollment } from "./types.ts";

export type CohortMetrics = {
  starters: number;
  completed: number;
  withdrew: number;
  pendingDecisions: number;
  promoted: number;
  notPromoted: number;
  pendingResponses: number;
  joined: number;
  declined: number;
  advancementRate?: number;
  offerYield?: number;
  endToEndConversion?: number;
};

export function calculateCohortMetrics(
  enrollments: readonly CohortEnrollment[],
): CohortMetrics {
  let completed = 0;
  let withdrew = 0;
  let pendingDecisions = 0;
  let promoted = 0;
  let notPromoted = 0;
  let pendingResponses = 0;
  let joined = 0;
  let declined = 0;

  for (const enrollment of enrollments) {
    if (enrollment.participationStatus === "completed") completed += 1;
    if (enrollment.participationStatus === "withdrew") withdrew += 1;
    if (enrollment.advancementStatus === "pending") pendingDecisions += 1;
    if (enrollment.advancementStatus === "not_promoted") notPromoted += 1;
    if (enrollment.advancementStatus === "promoted") {
      promoted += 1;
      if (enrollment.promotionResponse === "pending") pendingResponses += 1;
      if (enrollment.promotionResponse === "joined") joined += 1;
      if (enrollment.promotionResponse === "declined") declined += 1;
    }
  }

  const finalizedDecisions = promoted + notPromoted;
  const finalizedResponses = joined + declined;

  return {
    starters: enrollments.length,
    completed,
    withdrew,
    pendingDecisions,
    promoted,
    notPromoted,
    pendingResponses,
    joined,
    declined,
    advancementRate: finalizedDecisions ? promoted / finalizedDecisions : undefined,
    offerYield: finalizedResponses ? joined / finalizedResponses : undefined,
    endToEndConversion: enrollments.length ? joined / enrollments.length : undefined,
  };
}
