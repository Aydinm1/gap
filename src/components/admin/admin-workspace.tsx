"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import type { AdminWeek, AdminWorkspaceState } from "@/lib/program/admin";
import { requireAdmin } from "@/lib/program/admin";
import {
  mockApprovedMembers,
  mockAdminSubmissions,
  mockCohorts,
  mockEnrollments,
  mockPeople,
  mockUsers,
  mockWeeks,
} from "@/lib/program/mock-data";
import type { ApprovedMember, CohortEnrollment, ProgramCohort, SubmissionStatus } from "@/lib/program/types";
import { compareCohorts, formatCohortLabel } from "@/lib/program/state";
import { PageContainer } from "@/components/ui/container";

type AdminWorkspaceContextValue = AdminWorkspaceState & {
  selectedCohortId: string;
  setSelectedCohortId: (id: string) => void;
  setUnsavedChanges: (dirty: boolean) => void;
  navigate: (href: string) => void;
  updateSubmission: (id: string, status: SubmissionStatus, feedback?: string) => void;
  updateWeek: (week: AdminWeek) => void;
  updateEnrollment: (enrollment: CohortEnrollment) => void;
  addEnrollment: (personId: string) => void;
  updateApprovedMember: (member: ApprovedMember) => void;
  addApprovedMember: (input: { fullName: string; email: string; role: "member" | "admin" }) => void;
  createCohort: (cohort: ProgramCohort) => void;
  archiveSelectedCohort: () => void;
  setSelectedCohortState: (state: ProgramCohort["state"]) => void;
};

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

function toAdminWeek(week: (typeof mockWeeks)[number]): AdminWeek {
  return {
    id: week.id,
    cohortId: week.cohortId,
    weekNumber: week.weekNumber,
    title: week.title,
    description: week.publicationState === "published" ? week.description : "",
    slidesUrl: week.publicationState === "published" ? week.slidesUrl : undefined,
    publicationState: week.publicationState,
    resources: week.publicationState === "published" ? week.resources : [],
    assignment: week.publicationState === "published" ? week.assignment : undefined,
  };
}

export function useAdminWorkspace() {
  const value = useContext(AdminWorkspaceContext);
  if (!value) throw new Error("Admin workspace is unavailable.");
  return value;
}

export function AdminWorkspace({ children }: { children: ReactNode }) {
  requireAdmin(mockUsers.admin);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedCohortId, setStoredCohortId] = useState(mockCohorts.fall2026.id);
  const [hasUnsavedChanges, setUnsavedChanges] = useState(false);
  const [people, setPeople] = useState(Object.values(mockPeople));
  const [approvedMembers, setApprovedMembers] = useState<ApprovedMember[]>([...mockApprovedMembers]);
  const [cohorts, setCohorts] = useState<ProgramCohort[]>(Object.values(mockCohorts));
  const [enrollments, setEnrollments] = useState<CohortEnrollment[]>([...mockEnrollments]);
  const [weeks, setWeeks] = useState<AdminWeek[]>(mockWeeks.map(toAdminWeek));
  const [submissions, setSubmissions] = useState([...mockAdminSubmissions]);
  const requestedCohortId = searchParams.get("cohort");
  const selectedCohortId = cohorts.some((cohort) => cohort.id === requestedCohortId) ? requestedCohortId! : storedCohortId;

  const confirmNavigation = useCallback(() => {
    return !hasUnsavedChanges || window.confirm("Discard your unsaved changes?");
  }, [hasUnsavedChanges]);

  const navigate = useCallback((href: string) => {
    if (confirmNavigation()) router.push(href);
  }, [confirmNavigation, router]);

  const changeCohort = useCallback((id: string) => {
    if (!confirmNavigation()) return;
    setUnsavedChanges(false);
    setStoredCohortId(id);
    const destination = pathname.startsWith("/admin/weeks/") ? "/admin/weeks" : pathname.startsWith("/admin/submissions/") ? "/admin" : pathname;
    router.push(`${destination}?cohort=${encodeURIComponent(id)}`);
  }, [confirmNavigation, pathname, router]);

  const value = useMemo<AdminWorkspaceContextValue>(() => ({
    selectedCohortId,
    setSelectedCohortId: changeCohort,
    setUnsavedChanges,
    navigate,
    people,
    approvedMembers,
    cohorts,
    enrollments,
    weeks,
    submissions,
    updateSubmission(id, status, feedback) {
      setSubmissions((items) => items.map((item) => item.id === id ? {
        ...item,
        status,
        feedback: status === "submitted" ? undefined : feedback?.trim() || undefined,
        reviewedAt: status === "submitted" ? undefined : new Date().toISOString(),
        reviewedByUserId: status === "submitted" ? undefined : mockUsers.admin.id,
      } : item));
    },
    updateWeek(week) {
      setWeeks((items) => items.map((item) => item.id === week.id ? week : item));
    },
    updateEnrollment(enrollment) {
      setEnrollments((items) => items.map((item) => item.id === enrollment.id ? enrollment : item));
    },
    addEnrollment(personId) {
      setEnrollments((items) => [...items, {
        id: `enrollment-${crypto.randomUUID()}`,
        cohortId: selectedCohortId,
        personId,
        participationStatus: "enrolled",
        advancementStatus: "pending",
      }]);
    },
    updateApprovedMember(member) {
      setApprovedMembers((items) => items.map((item) => item.id === member.id ? member : item));
      setPeople((items) => items.map((item) => item.id === member.personId ? { ...item, email: member.email, fullName: member.fullName } : item));
    },
    addApprovedMember(input) {
      const personId = `person-${crypto.randomUUID()}`;
      const normalized = { ...input, email: input.email.trim().toLowerCase(), fullName: input.fullName.trim() };
      setPeople((items) => [...items, { id: personId, email: normalized.email, fullName: normalized.fullName }]);
      setApprovedMembers((items) => [...items, { id: `approved-${crypto.randomUUID()}`, personId, ...normalized, active: true }]);
    },
    createCohort(cohort) {
      setCohorts((items) => [...items, cohort]);
      setWeeks((items) => [...items, ...Array.from({ length: 6 }, (_, index): AdminWeek => ({
        id: `${cohort.id}-week-${index + 1}`,
        cohortId: cohort.id,
        weekNumber: index + 1,
        title: `Week ${index + 1}`,
        description: "",
        publicationState: "draft",
        resources: [],
      }))]);
      setStoredCohortId(cohort.id);
    },
    archiveSelectedCohort() {
      setCohorts((items) => items.map((item) => item.id === selectedCohortId ? { ...item, state: "archived" } : item));
    },
    setSelectedCohortState(state) {
      setCohorts((items) => items.map((item) => item.id === selectedCohortId ? { ...item, state } : item));
    },
  }), [approvedMembers, changeCohort, cohorts, enrollments, navigate, people, selectedCohortId, submissions, weeks]);

  const cohortQuery = `?cohort=${encodeURIComponent(selectedCohortId)}`;

  const navigation = [
    { label: "Review queue", href: `/admin${cohortQuery}`, current: pathname === "/admin" || pathname.startsWith("/admin/submissions") },
    { label: "Weeks", href: `/admin/weeks${cohortQuery}`, current: pathname.startsWith("/admin/weeks") },
    { label: "Members", href: `/admin/members${cohortQuery}`, current: pathname.startsWith("/admin/members") },
  ];

  return (
    <AdminWorkspaceContext.Provider value={value}>
      <div className="min-h-screen bg-canvas text-ink">
        <AppHeader user={mockUsers.admin} navigation={navigation} profileLinks={[{ label: "Return to program", href: "/" }]} />
        <div className="border-b border-border bg-surface-subtle">
          <PageContainer className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
            <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-bold text-ink" htmlFor="admin-cohort">Managing cohort</label><select id="admin-cohort" value={selectedCohortId} onChange={(event) => changeCohort(event.target.value)} className="min-h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm font-semibold text-ink">
              {(["active", "draft", "archived"] as const).map((state) => <optgroup key={state} label={state[0].toUpperCase() + state.slice(1)}>{cohorts.filter((cohort) => cohort.state === state).toSorted(compareCohorts).reverse().map((cohort) => <option key={cohort.id} value={cohort.id}>{formatCohortLabel(cohort)}</option>)}</optgroup>)}
            </select></div>
            <Link className="inline-flex min-h-10 items-center text-sm font-bold text-action hover:text-action-hover" href="/">Member portal →</Link>
          </PageContainer>
        </div>
        {children}
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
