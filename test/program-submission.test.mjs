import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SUBMISSION_BYTES,
  buildAssignmentPreviewAttempts,
  canReplaceSubmission,
  getAssignmentWorkspaceMode,
  getDefaultAssignmentPreviewState,
  normalizeSubmissionUrl,
  replaceSubmission,
  validateReviewFeedback,
  validateSubmissionFile,
} from "../src/lib/program/submission.ts";
import { buildWeekDetail } from "../src/lib/program/week-detail.ts";
import {
  MOCK_NOW,
  mockCohorts,
  mockEnrollments,
  mockSubmissions,
  mockWeeks,
} from "../src/lib/program/mock-data.ts";

test("assignment preview states switch between preparation and review without mutating fixtures", () => {
  const source = mockSubmissions.filter((attempt) => attempt.assignmentId === "assignment-week-2");
  const snapshot = structuredClone(source);
  const firstVisit = buildAssignmentPreviewAttempts({
    attempts: source,
    previewState: "first_visit",
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
  });
  const awaiting = buildAssignmentPreviewAttempts({
    attempts: source,
    previewState: "awaiting_review",
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
  });
  const completed = buildAssignmentPreviewAttempts({
    attempts: source,
    previewState: "completed",
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
  });

  assert.equal(getAssignmentWorkspaceMode(firstVisit), "prepare");
  assert.equal(getAssignmentWorkspaceMode(awaiting), "review");
  assert.equal(awaiting[0].status, "submitted");
  assert.equal(awaiting[0].feedback, undefined);
  assert.equal(completed[0].status, "completed");
  assert.match(completed[0].feedback ?? "", /all set/);
  assert.ok(completed[0].reviewedAt);
  assert.ok(completed[0].reviewedByUserId);
  const revisionRequested = buildAssignmentPreviewAttempts({
    attempts: source,
    previewState: "revision_requested",
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
  });
  assert.ok(revisionRequested[0].reviewedAt);
  assert.ok(revisionRequested[0].reviewedByUserId);
  assert.equal(getDefaultAssignmentPreviewState(source), "revision_requested");
  assert.deepEqual(source, snapshot);
});

test("week detail scopes published content and orders history and resources", () => {
  const detail = buildWeekDetail({
    weeks: mockWeeks,
    weekNumber: "2",
    cohortId: mockCohorts.fall2026.id,
    enrollmentId: mockEnrollments[0].id,
    submissions: mockSubmissions,
    now: MOCK_NOW,
  });
  assert.equal(detail?.assignment?.state, "revision_requested");
  assert.equal(detail?.assignment?.unsubmittedState, "due_soon");
  assert.equal(detail?.assignment?.attempts[0].isCurrent, true);
  assert.equal(detail?.assignment?.attempts[1].isCurrent, false);
  assert.deepEqual(detail?.week.resources.map((resource) => resource.sortOrder), [1, 2, 3]);
  assert.match(detail?.assignment?.dueLabel ?? "", /PDT/);
  assert.equal(
    buildWeekDetail({
      weeks: mockWeeks,
      weekNumber: "3",
      cohortId: mockCohorts.fall2026.id,
      enrollmentId: mockEnrollments[0].id,
      submissions: mockSubmissions,
      now: MOCK_NOW,
    }),
    undefined,
  );
  assert.equal(
    buildWeekDetail({
      weeks: mockWeeks,
      weekNumber: "2",
      cohortId: mockCohorts.spring2026.id,
      enrollmentId: mockEnrollments[1].id,
      submissions: mockSubmissions,
      now: MOCK_NOW,
    }),
    undefined,
  );
});

test("file validation accepts supported formats through the 20 MB boundary", () => {
  assert.equal(validateSubmissionFile(undefined), "Choose a file.");
  assert.equal(
    validateSubmissionFile({ name: "case.pdf", size: MAX_SUBMISSION_BYTES, type: "application/pdf" }),
    undefined,
  );
  assert.equal(
    validateSubmissionFile({ name: "case.docx", size: 1024, type: "" }),
    undefined,
  );
  assert.equal(
    validateSubmissionFile({ name: "case.txt", size: 10, type: "text/plain" }),
    "Choose a PDF, DOCX, PPTX, or XLSX file.",
  );
  assert.equal(
    validateSubmissionFile({ name: "case.pdf", size: MAX_SUBMISSION_BYTES + 1, type: "application/pdf" }),
    "File must be 20 MB or smaller.",
  );
});

test("revision requests require useful written feedback", () => {
  assert.equal(
    validateReviewFeedback("revision_requested", "  "),
    "Add feedback before requesting a revision.",
  );
  assert.equal(validateReviewFeedback("revision_requested", "Clarify the source."), undefined);
  assert.equal(validateReviewFeedback("completed", undefined), undefined);
});

test("link validation accepts web URLs and rejects blank, malformed, and unsafe protocols", () => {
  assert.deepEqual(normalizeSubmissionUrl(""), { error: "Enter a link." });
  assert.deepEqual(normalizeSubmissionUrl("docs.google.com/example"), { error: "Enter a valid link." });
  assert.deepEqual(normalizeSubmissionUrl("javascript:alert(1)"), { error: "Enter a valid link." });
  assert.equal(normalizeSubmissionUrl(" https://example.com/work ").value, "https://example.com/work");
});

test("replacement creates one current clean attempt and preserves reviewed history", () => {
  const attempts = mockSubmissions.filter((attempt) => attempt.assignmentId === "assignment-week-2");
  const replaced = replaceSubmission({
    attempts,
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
    payload: { type: "link", submittedUrl: "https://example.com/revision" },
    submittedAt: "2026-09-17T00:00:00.000Z",
    id: "new-attempt",
  });
  assert.equal(replaced.filter((attempt) => attempt.isCurrent).length, 1);
  assert.equal(replaced[0].status, "submitted");
  assert.equal(replaced[0].feedback, undefined);
  assert.equal(replaced[0].supersedesSubmissionId, "submission-week-2-aydin-2");
  assert.match(
    replaced.find((attempt) => attempt.id === "submission-week-2-aydin-2")?.feedback ?? "",
    /mutually exclusive/,
  );
});

test("members can replace actionable work but not completed work", () => {
  const attempts = mockSubmissions.filter((attempt) => attempt.assignmentId === "assignment-week-2");
  const completed = buildAssignmentPreviewAttempts({
    attempts,
    previewState: "completed",
    assignmentId: "assignment-week-2",
    enrollmentId: mockEnrollments[0].id,
  });

  assert.equal(canReplaceSubmission(undefined), true);
  assert.equal(canReplaceSubmission(attempts.find((attempt) => attempt.isCurrent)), true);
  assert.equal(canReplaceSubmission(completed[0]), false);
});
