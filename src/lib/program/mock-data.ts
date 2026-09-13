import type {
  Assignment,
  CohortEnrollment,
  Person,
  ApprovedMember,
  ProgramCohort,
  ProgramUser,
  ProgramWeek,
  SubmissionAttempt,
} from "./types.ts";

export const MOCK_NOW = new Date("2026-09-16T19:00:00.000Z");

export const mockPeople = {
  aydin: {
    id: "person-aydin-merchant",
    email: "aydin.merchant@ucdavis.edu",
    fullName: "Aydin Merchant",
  },
  jordan: {
    id: "person-jordan-lee",
    email: "jordan.lee@example.edu",
    fullName: "Jordan Lee",
  },
  priya: {
    id: "person-priya-shah",
    email: "priya.shah@example.edu",
    fullName: "Priya Shah",
  },
  maya: { id: "person-maya-chen", email: "maya.chen@ucdavis.edu", fullName: "Maya Chen" },
  leo: { id: "person-leo-martinez", email: "leo.martinez@ucdavis.edu", fullName: "Leo Martinez" },
  nina: { id: "person-nina-patel", email: "nina.patel@ucdavis.edu", fullName: "Nina Patel" },
  omar: { id: "person-omar-hassan", email: "omar.hassan@ucdavis.edu", fullName: "Omar Hassan" },
  sophia: { id: "person-sophia-kim", email: "sophia.kim@ucdavis.edu", fullName: "Sophia Kim" },
} satisfies Record<string, Person>;

export const mockApprovedMembers = Object.values(mockPeople).map((person, index) => ({
  id: `approved-${person.id}`,
  personId: person.id,
  email: person.email.replace("example.edu", "ucdavis.edu"),
  fullName: person.fullName,
  role: index === 0 ? "admin" : "member",
  active: true,
})) satisfies readonly ApprovedMember[];

export const mockCohorts = {
  spring2026: {
    id: "cohort-spring-2026",
    quarter: "spring",
    year: 2026,
    startsOn: "2026-03-30",
    endsOn: "2026-06-12",
    state: "archived",
  },
  fall2026: {
    id: "cohort-fall-2026",
    quarter: "fall",
    year: 2026,
    startsOn: "2026-09-21",
    endsOn: "2026-12-11",
    state: "active",
  },
} satisfies Record<string, ProgramCohort>;

export const mockEnrollments = [
  {
    id: "enrollment-aydin-fall-2026",
    cohortId: mockCohorts.fall2026.id,
    personId: mockPeople.aydin.id,
    participationStatus: "enrolled",
    advancementStatus: "pending",
  },
  { id: "enrollment-maya-fall-2026", cohortId: mockCohorts.fall2026.id, personId: mockPeople.maya.id, participationStatus: "enrolled", advancementStatus: "pending" },
  { id: "enrollment-leo-fall-2026", cohortId: mockCohorts.fall2026.id, personId: mockPeople.leo.id, participationStatus: "enrolled", advancementStatus: "pending" },
  { id: "enrollment-nina-fall-2026", cohortId: mockCohorts.fall2026.id, personId: mockPeople.nina.id, participationStatus: "enrolled", advancementStatus: "pending" },
  { id: "enrollment-omar-fall-2026", cohortId: mockCohorts.fall2026.id, personId: mockPeople.omar.id, participationStatus: "enrolled", advancementStatus: "pending" },
  { id: "enrollment-sophia-fall-2026", cohortId: mockCohorts.fall2026.id, personId: mockPeople.sophia.id, participationStatus: "enrolled", advancementStatus: "pending" },
  {
    id: "enrollment-jordan-spring-2026",
    cohortId: mockCohorts.spring2026.id,
    personId: mockPeople.jordan.id,
    participationStatus: "completed",
    advancementStatus: "promoted",
    promotionResponse: "joined",
  },
  {
    id: "enrollment-priya-spring-2026",
    cohortId: mockCohorts.spring2026.id,
    personId: mockPeople.priya.id,
    participationStatus: "completed",
    advancementStatus: "promoted",
    promotionResponse: "declined",
  },
] satisfies readonly CohortEnrollment[];

export const mockUsers = {
  member: {
    id: "user-aydin-merchant",
    personId: mockPeople.aydin.id,
    email: "aydin.merchant@ucdavis.edu",
    fullName: "Aydin Merchant",
    role: "member",
    initials: "AM",
  },
  admin: {
    id: "user-aydin-merchant",
    personId: mockPeople.aydin.id,
    email: "aydin.merchant@ucdavis.edu",
    fullName: "Aydin Merchant",
    role: "admin",
    initials: "AM",
  },
} satisfies Record<"member" | "admin", ProgramUser>;

const fundamentalsAssignment: Assignment = {
  id: "assignment-week-1",
  weekNumber: 1,
  title: "Consulting Fundamentals Reflection",
  instructions:
    "Summarize the client problem, identify the core stakeholders, and note two questions you would ask during a kickoff meeting.",
  dueAt: "2026-09-12T06:59:00.000Z",
};

export const researchPlanAssignment: Assignment = {
  id: "assignment-week-2",
  weekNumber: 2,
  title: "Research Plan Exercise",
  instructions:
    "Create a one-page research plan that frames the client question, organizes the work into MECE research areas, and identifies the first sources you would investigate.",
  dueAt: "2026-09-19T06:59:00.000Z",
};

export const mockWeeks: readonly ProgramWeek[] = [
  {
    id: "week-1",
    cohortId: mockCohorts.fall2026.id,
    weekNumber: 1,
    title: "Consulting Fundamentals",
    publicationState: "published",
    description:
      "Learn how consulting teams structure ambiguous problems and build trust with clients.",
    slidesUrl: "https://example.com/gap/week-1-slides",
    resources: [],
    assignment: fundamentalsAssignment,
  },
  {
    id: "week-2",
    cohortId: mockCohorts.fall2026.id,
    weekNumber: 2,
    title: "Research & Problem Solving",
    publicationState: "published",
    description:
      "Turn broad client questions into focused research plans and defensible workstreams.",
    slidesUrl: "https://example.com/gap/week-2-slides",
    resources: [
      {
        id: "resource-mece-guide",
        title: "MECE Framework Guide",
        description: "A practical reference for structuring issue trees and research areas.",
        type: "guide",
        url: "https://example.com/gap/mece-guide",
        sortOrder: 1,
      },
      {
        id: "resource-research-plan",
        title: "Sample Research Plan",
        description: "An annotated example showing scope, questions, sources, and ownership.",
        type: "template",
        url: "https://example.com/gap/research-plan",
        sortOrder: 2,
      },
      {
        id: "resource-source-quality",
        title: "Evaluating Source Quality",
        type: "reading",
        url: "https://example.com/gap/source-quality",
        sortOrder: 3,
      },
    ],
    assignment: researchPlanAssignment,
  },
  { id: "week-3", cohortId: mockCohorts.fall2026.id, weekNumber: 3, title: "Client Communication", publicationState: "draft" },
  { id: "week-4", cohortId: mockCohorts.fall2026.id, weekNumber: 4, title: "Data & Insights", publicationState: "draft" },
  { id: "week-5", cohortId: mockCohorts.fall2026.id, weekNumber: 5, title: "Building Recommendations", publicationState: "draft" },
  { id: "week-6", cohortId: mockCohorts.fall2026.id, weekNumber: 6, title: "Final Case", publicationState: "draft" },
];

export const mockSubmissions: readonly SubmissionAttempt[] = [
  {
    id: "submission-week-1-aydin",
    assignmentId: fundamentalsAssignment.id,
    enrollmentId: mockEnrollments[0].id,
    status: "completed",
    submittedAt: "2026-09-11T02:43:00.000Z",
    reviewedAt: "2026-09-13T18:15:00.000Z",
    reviewedByUserId: mockUsers.admin.id,
    feedback: "Strong stakeholder framing and thoughtful kickoff questions.",
    isCurrent: true,
    payload: {
      type: "link",
      submittedUrl: "https://docs.google.com/document/d/example-week-1",
    },
  },
  {
    id: "submission-week-2-aydin-1",
    assignmentId: researchPlanAssignment.id,
    enrollmentId: mockEnrollments[0].id,
    status: "submitted",
    submittedAt: "2026-09-15T23:43:00.000Z",
    isCurrent: false,
    payload: {
      type: "file",
      originalFilename: "research-plan-v1.pdf",
      filePath: "user-aydin-merchant/assignment-week-2/submission-v1-research-plan.pdf",
    },
  },
  {
    id: "submission-week-2-aydin-2",
    assignmentId: researchPlanAssignment.id,
    enrollmentId: mockEnrollments[0].id,
    status: "revision_requested",
    submittedAt: "2026-09-16T03:43:00.000Z",
    reviewedAt: "2026-09-16T17:20:00.000Z",
    reviewedByUserId: mockUsers.admin.id,
    feedback:
      "The issue areas are promising. Make them mutually exclusive and add a source for sizing each branch.",
    supersedesSubmissionId: "submission-week-2-aydin-1",
    isCurrent: true,
    payload: {
      type: "file",
      originalFilename: "research-plan.pdf",
      filePath: "user-aydin-merchant/assignment-week-2/submission-v2-research-plan.pdf",
    },
  },
];

export const mockAdminSubmissions: readonly SubmissionAttempt[] = [
  ...mockSubmissions,
  {
    id: "submission-week-2-maya",
    assignmentId: researchPlanAssignment.id,
    enrollmentId: "enrollment-maya-fall-2026",
    status: "submitted",
    submittedAt: "2026-09-16T17:05:00.000Z",
    isCurrent: true,
    payload: { type: "link", submittedUrl: "https://docs.google.com/document/d/maya-research-plan" },
  },
  {
    id: "submission-week-2-leo",
    assignmentId: researchPlanAssignment.id,
    enrollmentId: "enrollment-leo-fall-2026",
    status: "submitted",
    submittedAt: "2026-09-16T18:20:00.000Z",
    isCurrent: true,
    payload: { type: "file", originalFilename: "leo-research-plan.pptx", filePath: "mock/leo/research-plan.pptx" },
  },
  {
    id: "submission-week-2-nina",
    assignmentId: researchPlanAssignment.id,
    enrollmentId: "enrollment-nina-fall-2026",
    status: "completed",
    submittedAt: "2026-09-15T22:10:00.000Z",
    reviewedAt: "2026-09-16T16:00:00.000Z",
    reviewedByUserId: mockUsers.admin.id,
    feedback: "Clear structure and credible source choices.",
    isCurrent: true,
    payload: { type: "file", originalFilename: "nina-research-plan.pdf", filePath: "mock/nina/research-plan.pdf" },
  },
];

export const mockStatusExamples = [
  { label: "Not submitted", state: "upcoming" },
  { label: "Due soon", state: "due_soon" },
  { label: "Overdue", state: "overdue" },
  { label: "Submitted", state: "submitted" },
  { label: "Complete", state: "completed" },
  { label: "Revision requested", state: "revision_requested" },
] as const;
