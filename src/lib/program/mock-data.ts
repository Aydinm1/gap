import type {
  Assignment,
  ProgramUser,
  ProgramWeek,
  SubmissionAttempt,
} from "./types.ts";

export const MOCK_NOW = new Date("2026-09-16T19:00:00.000Z");
export const MOCK_PROGRAM_TERM = "Fall 2026";

export const mockUsers = {
  member: {
    id: "user-aydin-merchant",
    email: "aydin.merchant@ucdavis.edu",
    fullName: "Aydin Merchant",
    role: "member",
    initials: "AM",
  },
  admin: {
    id: "user-aydin-merchant",
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
  { id: "week-3", weekNumber: 3, title: "Client Communication", publicationState: "draft" },
  { id: "week-4", weekNumber: 4, title: "Data & Insights", publicationState: "draft" },
  { id: "week-5", weekNumber: 5, title: "Building Recommendations", publicationState: "draft" },
  { id: "week-6", weekNumber: 6, title: "Final Case", publicationState: "draft" },
];

export const mockSubmissions: readonly SubmissionAttempt[] = [
  {
    id: "submission-week-1-aydin",
    assignmentId: fundamentalsAssignment.id,
    userId: mockUsers.member.id,
    status: "reviewed",
    submittedAt: "2026-09-11T02:43:00.000Z",
    reviewedAt: "2026-09-13T18:15:00.000Z",
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
    userId: mockUsers.member.id,
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
    userId: mockUsers.member.id,
    status: "needs_revision",
    submittedAt: "2026-09-16T03:43:00.000Z",
    reviewedAt: "2026-09-16T17:20:00.000Z",
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

export const mockStatusExamples = [
  { label: "Not submitted", state: "upcoming" },
  { label: "Due soon", state: "due_soon" },
  { label: "Overdue", state: "overdue" },
  { label: "Submitted", state: "submitted" },
  { label: "Reviewed", state: "reviewed" },
  { label: "Needs revision", state: "needs_revision" },
] as const;
