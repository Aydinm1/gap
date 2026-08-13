import assert from "node:assert/strict";
import test from "node:test";
import { calculateCohortMetrics } from "../src/lib/program/cohorts.ts";
import {
  hasDuplicateCohortIdentity,
  hasDuplicateEnrollment,
  hasDuplicateWeekNumber,
  isValidOutcomeCombination,
  enrollmentLifecycle,
} from "../src/lib/program/cohort-validation.ts";
import { compareCohorts, formatCohortLabel } from "../src/lib/program/state.ts";
import { mockCohorts, mockEnrollments, mockWeeks } from "../src/lib/program/mock-data.ts";

test("Fall, Winter, and Spring cohorts format and sort chronologically", () => {
  const cohorts = [
    { ...mockCohorts.fall2026 },
    { ...mockCohorts.spring2026 },
    {
      id: "cohort-winter-2026",
      quarter: "winter",
      year: 2026,
      startsOn: "2026-01-05",
      endsOn: "2026-03-20",
      state: "archived",
    },
  ].toSorted(compareCohorts);

  assert.deepEqual(cohorts.map(formatCohortLabel), [
    "Winter 2026",
    "Spring 2026",
    "Fall 2026",
  ]);
});

test("cohort metrics keep decisions, responses, and starter conversion distinct", () => {
  const enrollments = [
    ...mockEnrollments.filter(
      (enrollment) => enrollment.cohortId === mockCohorts.spring2026.id,
    ),
    {
      id: "enrollment-not-promoted",
      cohortId: mockCohorts.spring2026.id,
      personId: "person-not-promoted",
      participationStatus: "completed",
      advancementStatus: "not_promoted",
    },
    {
      id: "enrollment-withdrew",
      cohortId: mockCohorts.spring2026.id,
      personId: "person-withdrew",
      participationStatus: "withdrew",
      advancementStatus: "pending",
    },
  ];

  const metrics = calculateCohortMetrics(enrollments);
  assert.equal(metrics.starters, 4);
  assert.equal(metrics.completed, 3);
  assert.equal(metrics.withdrew, 1);
  assert.equal(metrics.promoted, 2);
  assert.equal(metrics.notPromoted, 1);
  assert.equal(metrics.pendingDecisions, 1);
  assert.equal(metrics.joined, 1);
  assert.equal(metrics.declined, 1);
  assert.equal(metrics.advancementRate, 2 / 3);
  assert.equal(metrics.offerYield, 1 / 2);
  assert.equal(metrics.endToEndConversion, 1 / 4);
});

test("rates remain undefined when their denominator has no finalized records", () => {
  const metrics = calculateCohortMetrics([mockEnrollments[0]]);
  assert.equal(metrics.advancementRate, undefined);
  assert.equal(metrics.offerYield, undefined);
  assert.equal(metrics.endToEndConversion, 0);
});

test("outcome validation accepts only coherent promotion responses", () => {
  assert.equal(
    isValidOutcomeCombination({ advancementStatus: "pending" }),
    true,
  );
  assert.equal(
    isValidOutcomeCombination({ advancementStatus: "not_promoted" }),
    true,
  );
  assert.equal(
    isValidOutcomeCombination({
      advancementStatus: "promoted",
      promotionResponse: "joined",
    }),
    true,
  );
  assert.equal(
    isValidOutcomeCombination({ advancementStatus: "promoted" }),
    false,
  );
  assert.equal(
    isValidOutcomeCombination({
      advancementStatus: "not_promoted",
      promotionResponse: "declined",
    }),
    false,
  );
});

test("cohort identity allows Winter and rejects duplicate quarter-year pairs", () => {
  const winter = {
    quarter: "winter",
    year: 2027,
  };
  assert.equal(
    hasDuplicateCohortIdentity([mockCohorts.fall2026, winter]),
    false,
  );
  assert.equal(
    hasDuplicateCohortIdentity([winter, { ...winter }]),
    true,
  );
});

test("enrollments and week numbers are unique within a cohort", () => {
  assert.equal(hasDuplicateEnrollment(mockEnrollments), false);
  assert.equal(
    hasDuplicateEnrollment([mockEnrollments[0], { ...mockEnrollments[0], id: "copy" }]),
    true,
  );
  assert.equal(
    hasDuplicateEnrollment([
      mockEnrollments[0],
      {
        ...mockEnrollments[0],
        id: "same-person-new-cohort",
        cohortId: mockCohorts.spring2026.id,
      },
    ]),
    false,
  );
  assert.equal(hasDuplicateWeekNumber(mockWeeks), false);
  assert.equal(
    hasDuplicateWeekNumber([
      mockWeeks[0],
      { ...mockWeeks[0], id: "spring-week-1", cohortId: mockCohorts.spring2026.id },
    ]),
    false,
  );
  assert.equal(
    hasDuplicateWeekNumber([mockWeeks[0], { ...mockWeeks[0], id: "duplicate" }]),
    true,
  );
});

test("active and past participation derive from cohort and enrollment state", () => {
  assert.equal(
    enrollmentLifecycle(mockCohorts.fall2026, mockEnrollments[0]),
    "active",
  );
  assert.equal(
    enrollmentLifecycle(mockCohorts.spring2026, mockEnrollments[1]),
    "past",
  );
});
