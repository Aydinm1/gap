export type AppRole = "member" | "admin";
export type WeekPublicationState = "draft" | "published";
export type SubmissionStatus = "submitted" | "reviewed" | "needs_revision";
export type SubmissionType = "file" | "link";
export type AssignmentDisplayState =
  | SubmissionStatus
  | "overdue"
  | "due_soon"
  | "upcoming";

export type ProgramUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  initials: string;
};

export type Resource = {
  id: string;
  title: string;
  description?: string;
  type: "guide" | "template" | "reading" | "video";
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

export type SubmissionPayload = FileSubmission | LinkSubmission;

export type SubmissionAttempt = {
  id: string;
  assignmentId: string;
  userId: string;
  status: SubmissionStatus;
  submittedAt: string;
  isCurrent: boolean;
  feedback?: string;
  reviewedAt?: string;
  supersedesSubmissionId?: string;
  payload: SubmissionPayload;
};

export type Assignment = {
  id: string;
  weekNumber: number;
  title: string;
  instructions: string;
  dueAt: string;
};

export type WeekCatalogItem = {
  id: string;
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
  assignment?: Assignment;
};

export type ProgramWeek = DraftWeek | PublishedWeek;

export function isPublishedWeek(week: ProgramWeek): week is PublishedWeek {
  return week.publicationState === "published";
}
