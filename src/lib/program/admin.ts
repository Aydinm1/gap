import type {
  ApprovedMember,
  Assignment,
  CohortEnrollment,
  Person,
  ProgramCohort,
  ProgramUser,
  Resource,
  SubmissionAttempt,
  WeekPublicationState,
} from "./types.ts";
import { deriveAssignmentState } from "./state.ts";

export type AdminWeek = {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  description: string;
  slidesUrl?: string;
  publicationState: WeekPublicationState;
  resources: readonly Resource[];
  assignment?: Assignment;
};

export type AdminWorkspaceState = {
  people: readonly Person[];
  approvedMembers: readonly ApprovedMember[];
  cohorts: readonly ProgramCohort[];
  enrollments: readonly CohortEnrollment[];
  weeks: readonly AdminWeek[];
  submissions: readonly SubmissionAttempt[];
};

export type AdminQueueFilter = "awaiting_review" | "revision_requested" | "missing" | "complete" | "all";
export type AdminSubmissionRow = ReturnType<typeof getSubmissionRows>[number];

export function requireAdmin(user: ProgramUser) {
  if (user.role !== "admin") throw new Error("Admin access required.");
  return user;
}

export function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCohort(input: Pick<ProgramCohort, "quarter" | "year" | "startsOn" | "endsOn">, cohorts: readonly ProgramCohort[]) {
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) return "Enter a valid cohort year.";
  if (!input.startsOn || !input.endsOn || input.endsOn < input.startsOn) return "End date must be on or after the start date.";
  if (cohorts.some((cohort) => cohort.quarter === input.quarter && cohort.year === input.year)) return "That cohort already exists.";
}

export function validateRosterMember(input: Pick<ApprovedMember, "email" | "fullName">, members: readonly ApprovedMember[], excludeId?: string) {
  const email = input.email.trim().toLowerCase();
  if (!input.fullName.trim()) return "Enter the member’s full name.";
  if (!email.endsWith("@ucdavis.edu") || !email.includes("@")) return "Use a valid @ucdavis.edu email address.";
  if (members.some((member) => member.id !== excludeId && member.email.toLowerCase() === email)) return "That email is already on the approved roster.";
}

export function validateAdminWeek(week: AdminWeek, options: { forPublish?: boolean } = {}) {
  const forPublish = options.forPublish ?? week.publicationState === "published";
  if (forPublish && !week.title.trim()) return "Enter a week title before publishing.";
  if (forPublish && !week.description.trim()) return "Add a description before publishing.";
  if (week.slidesUrl && !isWebUrl(week.slidesUrl)) return "Enter a valid presentation URL.";
  if (week.assignment) {
    if (forPublish && (!week.assignment.title.trim() || !week.assignment.instructions.trim())) return "Complete the assignment title and instructions before publishing.";
    if (week.assignment.dueAt && Number.isNaN(new Date(week.assignment.dueAt).getTime())) return "Enter a valid assignment deadline.";
    if (forPublish && !week.assignment.dueAt) return "Enter an assignment deadline before publishing.";
  }
  if (week.resources.some((resource) => !resource.title.trim() || !isWebUrl(resource.url))) return "Every resource needs a title and valid URL.";
}

export function filterSubmissionRows(rows: readonly AdminSubmissionRow[], filter: AdminQueueFilter, search = "") {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch = !query || `${row.person?.fullName ?? ""} ${row.person?.email ?? ""}`.toLowerCase().includes(query);
    if (!matchesSearch || filter === "all") return matchesSearch;
    if (filter === "awaiting_review") return row.state === "submitted";
    if (filter === "revision_requested") return row.state === "revision_requested";
    if (filter === "complete") return row.state === "completed";
    return !row.submission;
  });
}

export function getAdminQueueCounts(rows: readonly AdminSubmissionRow[]) {
  return {
    awaiting_review: rows.filter((row) => row.state === "submitted").length,
    revision_requested: rows.filter((row) => row.state === "revision_requested").length,
    missing: rows.filter((row) => !row.submission).length,
    complete: rows.filter((row) => row.state === "completed").length,
    all: rows.length,
  };
}

export function getNextAwaitingSubmission(rows: readonly AdminSubmissionRow[], currentSubmissionId: string) {
  return rows.find((row) => row.state === "submitted" && row.submission?.id !== currentSubmissionId)?.submission;
}

const PACIFIC_ZONE = "America/Los_Angeles";

function pacificParts(date: Date, includeZone = false) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23",
    ...(includeZone ? { timeZoneName: "short" as const } : {}),
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatPacificDateTimeInput(iso: string) {
  const parts = pacificParts(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function pacificWallTimeToUtc(value: string, zone?: "PDT" | "PST") {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { error: "Enter a valid Pacific deadline." } as const;
  const [, year, month, day, hour, minute] = match;
  const target = `${year}-${month}-${day}T${hour}:${minute}`;
  const anchor = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const candidates: { iso: string; zone: "PDT" | "PST" }[] = [];
  for (let offset = -12 * 60; offset <= 12 * 60; offset += 30) {
    const date = new Date(anchor + offset * 60_000);
    const parts = pacificParts(date, true);
    if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === target) {
      candidates.push({ iso: date.toISOString(), zone: parts.timeZoneName === "PST" ? "PST" : "PDT" });
    }
  }
  if (!candidates.length) return { error: "That time does not exist in Pacific time because of daylight saving time." } as const;
  if (candidates.length > 1 && !zone) return { error: "Choose PDT or PST for this repeated Pacific time." } as const;
  const selected = candidates.find((candidate) => candidate.zone === zone) ?? candidates[0];
  return { value: selected.iso, zone: selected.zone } as const;
}

export function getCurrentAdminWeek(weeks: readonly AdminWeek[]) {
  return weeks
    .filter((week) => week.publicationState === "published" && week.assignment)
    .toSorted((left, right) => right.weekNumber - left.weekNumber)[0];
}

export function getSubmissionRows({ state, cohortId, weekId, now }: { state: AdminWorkspaceState; cohortId: string; weekId: string; now: Date }) {
  const week = state.weeks.find((item) => item.id === weekId && item.cohortId === cohortId);
  const enrollments = state.enrollments.filter((item) => item.cohortId === cohortId && item.participationStatus === "enrolled");
  if (!week?.assignment) return [];
  const assignment = week.assignment;
  return enrollments.map((enrollment) => {
    const person = state.people.find((item) => item.id === enrollment.personId);
    const submission = state.submissions.find((item) => item.assignmentId === assignment.id && item.enrollmentId === enrollment.id && item.isCurrent);
    return {
      enrollment,
      person,
      submission,
      state: deriveAssignmentState(assignment, submission, now),
    };
  }).toSorted((left, right) => {
    const priority = { submitted: 0, revision_requested: 1, overdue: 2, due_soon: 3, upcoming: 4, completed: 5 } as const;
    return priority[left.state] - priority[right.state] || (left.person?.fullName ?? "").localeCompare(right.person?.fullName ?? "");
  });
}
