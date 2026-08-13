import assert from "node:assert/strict";
import test from "node:test";
import {
  MOCK_NOW,
  mockSubmissions,
  mockWeeks,
  researchPlanAssignment,
} from "../src/lib/program/mock-data.ts";
import {
  countCompletedModules,
  deriveAssignmentState,
  findCurrentActionableWeek,
  findNearestActionableAssignment,
  formatDeadline,
} from "../src/lib/program/state.ts";

const baseAssignment = {
  id: "state-test",
  weekNumber: 2,
  title: "State test",
  instructions: "Test state precedence.",
  dueAt: "2026-09-19T19:00:00.000Z",
};

function submission(status) {
  return {
    id: `submission-${status}`,
    assignmentId: baseAssignment.id,
    enrollmentId: "enrollment-test",
    status,
    submittedAt: "2026-09-16T18:00:00.000Z",
    isCurrent: true,
    payload: { type: "link", submittedUrl: "https://example.com/work" },
  };
}

test("stored submission states take precedence over deadline states", () => {
  assert.equal(deriveAssignmentState(baseAssignment, submission("needs_revision"), MOCK_NOW), "needs_revision");
  assert.equal(deriveAssignmentState(baseAssignment, submission("reviewed"), MOCK_NOW), "reviewed");
  assert.equal(deriveAssignmentState(baseAssignment, submission("submitted"), MOCK_NOW), "submitted");
});

test("deadline states include the exact 72-hour due-soon boundary", () => {
  assert.equal(deriveAssignmentState(baseAssignment, undefined, MOCK_NOW), "due_soon");
  assert.equal(
    deriveAssignmentState(
      { ...baseAssignment, dueAt: "2026-09-19T19:00:00.001Z" },
      undefined,
      MOCK_NOW,
    ),
    "upcoming",
  );
  assert.equal(
    deriveAssignmentState(
      { ...baseAssignment, dueAt: "2026-09-16T18:59:59.999Z" },
      undefined,
      MOCK_NOW,
    ),
    "overdue",
  );
});

test("completion and actionable selectors follow the product rules", () => {
  const currentByAssignment = new Map(
    mockSubmissions
      .filter((attempt) => attempt.isCurrent)
      .map((attempt) => [attempt.assignmentId, attempt]),
  );

  assert.equal(countCompletedModules(mockSubmissions), 1);
  assert.equal(findCurrentActionableWeek(mockWeeks, currentByAssignment)?.weekNumber, 2);
  assert.equal(
    findNearestActionableAssignment(mockWeeks, currentByAssignment)?.id,
    researchPlanAssignment.id,
  );
});

test("draft weeks expose catalog fields only and resources are deterministic", () => {
  const draft = mockWeeks.find((week) => week.publicationState === "draft");
  assert.ok(draft);
  assert.equal("description" in draft, false);
  assert.equal("assignment" in draft, false);

  const weekTwo = mockWeeks.find((week) => week.weekNumber === 2);
  assert.ok(weekTwo && weekTwo.publicationState === "published");
  assert.deepEqual(
    weekTwo.resources.map((resource) => resource.sortOrder),
    [1, 2, 3],
  );
});

test("file and link fixtures carry only their valid payload", () => {
  for (const attempt of mockSubmissions) {
    if (attempt.payload.type === "file") {
      assert.equal("submittedUrl" in attempt.payload, false);
      assert.ok(attempt.payload.originalFilename);
    } else {
      assert.equal("filePath" in attempt.payload, false);
      assert.match(attempt.payload.submittedUrl, /^https?:\/\//);
    }
  }
});

test("deadlines are displayed in the program timezone", () => {
  const formatted = formatDeadline(researchPlanAssignment.dueAt);
  assert.match(formatted, /Friday, September 18/);
  assert.match(formatted, /11:59 PM/);
  assert.match(formatted, /PDT/);
});

test("member and admin previews use the same showcase identity", async () => {
  const { mockUsers } = await import("../src/lib/program/mock-data.ts");
  assert.equal(mockUsers.member.fullName, "Aydin Merchant");
  assert.equal(mockUsers.admin.fullName, "Aydin Merchant");
  assert.equal(mockUsers.member.email, "aydin.merchant@ucdavis.edu");
  assert.equal(mockUsers.admin.email, "aydin.merchant@ucdavis.edu");
  assert.equal(mockUsers.member.initials, "AM");
  assert.equal(mockUsers.admin.initials, "AM");
});
