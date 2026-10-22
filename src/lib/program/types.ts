export type AppRole = "member" | "admin" | "viewer";
export type ProgramQuarter = "fall" | "winter" | "spring";
export type CohortState = "draft" | "active" | "archived";
export type ParticipationStatus = "enrolled" | "completed" | "withdrew";
export type AdvancementStatus = "pending" | "promoted" | "not_promoted";
export type PromotionResponse = "pending" | "joined" | "declined";
export type WeekPublicationState = "draft" | "published";
export type SubmissionStatus = "submitted" | "revision_requested" | "completed";
export type SubmissionType = "file" | "link" | "text";
export type AssignmentDisplayState =
  | SubmissionStatus
  | "overdue"
  | "due_soon"
  | "upcoming";

export type ProgramUser = {
  id: string;
  personId: string;
  email: string;
  fullName: string;
  role: AppRole;
  initials: string;
};

export type Person = {
  id: string;
  email: string;
  fullName: string;
};

export type ApprovedMember = {
  id: string;
  personId: string;
  email: string;
  fullName: string;
  role: AppRole;
  active: boolean;
};

export type ProgramCohort = {
  id: string;
  quarter: ProgramQuarter;
  year: number;
  startsOn: string;
  endsOn: string;
  state: CohortState;
};

type PendingOrNotPromotedEnrollment = {
  advancementStatus: "pending" | "not_promoted";
  promotionResponse?: never;
};

type PromotedEnrollment = {
  advancementStatus: "promoted";
  promotionResponse: PromotionResponse;
};

export type CohortEnrollment = {
  id: string;
  cohortId: string;
  personId: string;
  participationStatus: ParticipationStatus;
} & (PendingOrNotPromotedEnrollment | PromotedEnrollment);

export type Resource = {
  id: string;
  title: string;
  description?: string;
  type: "guide" | "template" | "reading" | "video" | "workshop";
  url: string;
  sortOrder: number;
};

export type FileSubmission = {
  type: "file";
  originalFilename: string;
  filePath: string;
};

export type LinkSubmission = {
  type: "link";
  submittedUrl: string;
};

export type TextSubmission = { type: "text"; submittedText: string };
export type SubmissionPayload = FileSubmission | LinkSubmission | TextSubmission;

export type SubmissionAttempt = {
  updatedAt?: string;
  id: string;
  assignmentId: string;
  enrollmentId: string;
  status: SubmissionStatus;
  submittedAt: string;
  isCurrent: boolean;
  feedback?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  supersedesSubmissionId?: string;
  payload: SubmissionPayload;
};

export type Assignment = {
  id: string;
  weekNumber: number;
  title: string;
  instructions: string;
  summary?: string;
  instructionsFormat?: 'plain' | 'markdown';
  document?: { id: string; name: string };
  dueAt: string;
};

export type WeekCatalogItem = {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  publicationState: WeekPublicationState;
};

export type DraftWeek = WeekCatalogItem & {
  publicationState: "draft";
};

export type PublishedWeek = WeekCatalogItem & {
  publicationState: "published";
  description: string;
  slidesUrl?: string;
  resources: readonly Resource[];
  assignments?: readonly Assignment[];
  /** Legacy development fixtures; persistent reads use assignments. */
  assignment?: Assignment;
};

export type ProgramWeek = DraftWeek | PublishedWeek;

export function isPublishedWeek(week: ProgramWeek): week is PublishedWeek {
  return week.publicationState === "published";
}

export function assignmentsForWeek(week: { assignments?: readonly Assignment[]; assignment?: Assignment }): readonly Assignment[] {
  return week.assignments ?? (week.assignment ? [week.assignment] : []);
}
