import assert from "node:assert/strict";
import test from "node:test";
import { replaceSubmission } from "../src/lib/program/submission.ts";
import { buildProgramDashboard } from "../src/lib/program/dashboard.ts";
import { buildWeekDetail } from "../src/lib/program/week-detail.ts";
import { MOCK_NOW, mockCohorts, mockEnrollments, mockUsers, mockWeeks, mockSubmissions } from "../src/lib/program/mock-data.ts";

test("resubmission updates the member journey without replacing other assignments", () => {
  const enrollment = mockEnrollments[0];
  const original = mockSubmissions.find((attempt) => attempt.assignmentId === "assignment-week-2" && attempt.isCurrent && attempt.enrollmentId === enrollment.id);
  assert.ok(original);
  const submissions = replaceSubmission({ attempts: mockSubmissions, assignmentId: original.assignmentId, enrollmentId: enrollment.id, payload: { type: "link", submittedUrl: "https://example.com/revision" }, submittedAt: MOCK_NOW.toISOString(), id: "new-revision" });
  for (const attempt of mockSubmissions.filter((item) => item.assignmentId !== original.assignmentId || item.enrollmentId !== enrollment.id)) assert.deepEqual(submissions.find((item) => item.id === attempt.id), attempt);
  assert.equal(submissions.find((item) => item.id === original.id).isCurrent, false);
  const detail = buildWeekDetail({ weeks: mockWeeks, weekNumber: "2", cohortId: enrollment.cohortId, enrollmentId: enrollment.id, submissions, now: MOCK_NOW });
  assert.equal(detail.assignment.state, "submitted");
  assert.equal(detail.assignment.attempts[0].id, "new-revision");
  const dashboard = buildProgramDashboard({ user: mockUsers.member, cohort: mockCohorts.fall2026, enrollment, weeks: mockWeeks, submissions, now: MOCK_NOW });
  assert.equal(dashboard.completedModules, 2);
  assert.equal(dashboard.priorityAssignment, undefined);
  assert.equal(dashboard.modules[1].assignmentState, "submitted");
});
