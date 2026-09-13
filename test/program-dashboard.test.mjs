import assert from "node:assert/strict";
import test from "node:test";
import { buildProgramDashboard } from "../src/lib/program/dashboard.ts";
import { findPublishedWeek } from "../src/lib/program/catalog.ts";
import {
  MOCK_NOW,
  mockCohorts,
  mockEnrollments,
  mockSubmissions,
  mockUsers,
  mockWeeks,
} from "../src/lib/program/mock-data.ts";

const cohortContext = {
  cohort: mockCohorts.fall2026,
  enrollment: mockEnrollments[0],
};

test("canonical dashboard centers Week 2 revision work", () => {
  const dashboard = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: mockWeeks,
    submissions: mockSubmissions,
    now: MOCK_NOW,
  });

  assert.equal(dashboard.currentWeekNumber, 2);
  assert.equal(dashboard.completedModules, 1);
  assert.equal(dashboard.totalModules, 6);
  assert.equal(dashboard.continueLearning?.title, "Research & Problem Solving");
  assert.equal(dashboard.continueLearning?.href, "/week/2");
  assert.equal(dashboard.priorityAssignment?.state, "revision_requested");
  assert.equal(dashboard.priorityAssignment?.href, "/week/2");
  assert.equal(dashboard.priorityAssignment?.actionHref, "/week/2/submission");
  assert.equal(dashboard.priorityAssignment?.actionLabel, "View feedback");
  assert.match(dashboard.priorityAssignment?.dueLabel ?? "", /September 18/);
  assert.match(dashboard.priorityAssignment?.feedback ?? "", /mutually exclusive/);
  assert.deepEqual(
    dashboard.modules.map((module) => module.state),
    ["complete", "current", "locked", "locked", "locked", "locked"],
  );
  assert.deepEqual(
    dashboard.modules.slice(0, 2).map((module) => module.href),
    ["/week/1", "/week/2"],
  );
});

test("draft modules expose catalog fields without links", () => {
  const dashboard = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: mockWeeks,
    submissions: mockSubmissions,
    now: MOCK_NOW,
  });

  for (const programModule of dashboard.modules.filter((item) => item.state === "locked")) {
    assert.equal(programModule.href, undefined);
    assert.equal(programModule.assignmentState, undefined);
    assert.deepEqual(Object.keys(programModule).toSorted(), ["id", "state", "title", "weekNumber"]);
  }
});

test("dashboard supports empty and caught-up program states", () => {
  const empty = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: [],
    submissions: [],
    now: MOCK_NOW,
  });
  assert.equal(empty.totalModules, 0);
  assert.equal(empty.continueLearning, undefined);
  assert.equal(empty.priorityAssignment, undefined);

  const completed = mockSubmissions.map((submission) =>
    submission.isCurrent && submission.assignmentId === "assignment-week-2"
      ? { ...submission, status: "completed" }
      : submission,
  );
  const caughtUp = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: mockWeeks,
    submissions: completed,
    now: MOCK_NOW,
  });
  assert.equal(caughtUp.continueLearning, undefined);
  assert.equal(caughtUp.completedModules, 2);
});

test("published week lookup rejects drafts and malformed route values", () => {
  assert.equal(findPublishedWeek(mockWeeks, "1")?.title, "Consulting Fundamentals");
  assert.equal(findPublishedWeek(mockWeeks, "3"), undefined);
  assert.equal(findPublishedWeek(mockWeeks, "0"), undefined);
  assert.equal(findPublishedWeek(mockWeeks, "01"), undefined);
  assert.equal(findPublishedWeek(mockWeeks, "anything"), undefined);
});

test("dashboard handles no submissions and published weeks without assignments", () => {
  const noSubmissions = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: mockWeeks,
    submissions: [],
    now: MOCK_NOW,
  });
  assert.equal(noSubmissions.completedModules, 0);
  assert.equal(noSubmissions.currentWeekNumber, 1);
  assert.equal(noSubmissions.priorityAssignment?.state, "overdue");

  const noAssignment = buildProgramDashboard({
    user: mockUsers.member,
    ...cohortContext,
    weeks: [
      {
        id: "week-without-assignment",
        cohortId: mockCohorts.fall2026.id,
        weekNumber: 1,
        title: "Published module",
        publicationState: "published",
        description: "A published module with no assignment.",
        resources: [],
      },
    ],
    submissions: [],
    now: MOCK_NOW,
  });
  assert.equal(noAssignment.continueLearning?.title, "Published module");
  assert.equal(noAssignment.priorityAssignment, undefined);
});

test("dashboard rejects a person or cohort that does not match the enrollment", () => {
  assert.throws(
    () =>
      buildProgramDashboard({
        user: mockUsers.member,
        cohort: mockCohorts.spring2026,
        enrollment: mockEnrollments[0],
        weeks: mockWeeks,
        submissions: mockSubmissions,
        now: MOCK_NOW,
      }),
    /does not match/,
  );
});
