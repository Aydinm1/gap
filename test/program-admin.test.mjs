import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentAdminWeek,
  filterSubmissionRows,
  getAdminQueueCounts,
  getNextAwaitingSubmission,
  getSubmissionRows,
  formatPacificDateTimeInput,
  pacificWallTimeToUtc,
  requireAdmin,
  validateAdminWeek,
  validateCohort,
  validateRosterMember,
} from "../src/lib/program/admin.ts";
import {
  MOCK_NOW,
  mockAdminSubmissions,
  mockApprovedMembers,
  mockCohorts,
  mockEnrollments,
  mockPeople,
  mockUsers,
  mockWeeks,
} from "../src/lib/program/mock-data.ts";

const adminWeeks = mockWeeks.map((week) => ({
  id: week.id,
  cohortId: week.cohortId,
  weekNumber: week.weekNumber,
  title: week.title,
  description: week.publicationState === "published" ? week.description : "",
  slidesUrl: week.publicationState === "published" ? week.slidesUrl : undefined,
  publicationState: week.publicationState,
  resources: week.publicationState === "published" ? week.resources : [],
  assignment: week.publicationState === "published" ? week.assignment : undefined,
}));

test("admin authorization rejects the member mock role", () => {
  assert.equal(requireAdmin(mockUsers.admin).role, "admin");
  assert.throws(() => requireAdmin(mockUsers.member), /Admin access required/);
});

test("admin queue selects the latest published assignment and prioritizes review work", () => {
  const current = getCurrentAdminWeek(adminWeeks);
  assert.equal(current?.weekNumber, 2);
  const rows = getSubmissionRows({
    state: {
      people: Object.values(mockPeople),
      approvedMembers: mockApprovedMembers,
      cohorts: Object.values(mockCohorts),
      enrollments: mockEnrollments,
      weeks: adminWeeks,
      submissions: mockAdminSubmissions,
    },
    cohortId: mockCohorts.fall2026.id,
    weekId: current.id,
    now: MOCK_NOW,
  });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.slice(0, 2).map((row) => row.state), ["submitted", "submitted"]);
  assert.ok(rows.some((row) => row.state === "revision_requested"));
  assert.ok(rows.some((row) => row.state === "completed"));
  assert.ok(rows.some((row) => row.submission === undefined));
});

test("admin validation protects cohort, roster, and publishable week contracts", () => {
  assert.match(validateCohort({ quarter: "fall", year: 2026, startsOn: "2026-09-01", endsOn: "2026-12-01" }, Object.values(mockCohorts)) ?? "", /already exists/);
  assert.match(validateCohort({ quarter: "winter", year: 2027, startsOn: "2027-03-01", endsOn: "2027-01-01" }, Object.values(mockCohorts)) ?? "", /End date/);
  assert.match(validateRosterMember({ fullName: "Test Person", email: "test@example.com" }, mockApprovedMembers) ?? "", /ucdavis/);
  assert.match(validateRosterMember({ fullName: "Aydin Merchant", email: "aydin.merchant@ucdavis.edu" }, mockApprovedMembers) ?? "", /already/);
  assert.match(validateAdminWeek({ ...adminWeeks[2], publicationState: "published", description: "" }) ?? "", /description/);
  assert.equal(validateAdminWeek(adminWeeks[1]), undefined);
});

test("admin queue filters are mutually exclusive and select the next review", () => {
  const week = getCurrentAdminWeek(adminWeeks);
  const rows = getSubmissionRows({ state: { people: Object.values(mockPeople), approvedMembers: mockApprovedMembers, cohorts: Object.values(mockCohorts), enrollments: mockEnrollments, weeks: adminWeeks, submissions: mockAdminSubmissions }, cohortId: mockCohorts.fall2026.id, weekId: week.id, now: MOCK_NOW });
  const counts = getAdminQueueCounts(rows);
  assert.equal(Object.values(counts).slice(0, 4).reduce((sum, count) => sum + count, 0), counts.all);
  assert.equal(filterSubmissionRows(rows, "awaiting_review").length, counts.awaiting_review);
  assert.ok(filterSubmissionRows(rows, "all", "aydin").every((row) => row.person.fullName.includes("Aydin")));
  const current = filterSubmissionRows(rows, "awaiting_review")[0].submission;
  assert.notEqual(getNextAwaitingSubmission(rows, current.id)?.id, current.id);
});

test("Pacific wall-clock deadlines reject gaps and disambiguate repeated times", () => {
  assert.match(pacificWallTimeToUtc("2026-03-08T02:30").error ?? "", /does not exist/);
  assert.match(pacificWallTimeToUtc("2026-11-01T01:30").error ?? "", /PDT or PST/);
  const daylight = pacificWallTimeToUtc("2026-11-01T01:30", "PDT").value;
  const standard = pacificWallTimeToUtc("2026-11-01T01:30", "PST").value;
  assert.notEqual(daylight, standard);
  assert.equal(formatPacificDateTimeInput(daylight), "2026-11-01T01:30");
});
