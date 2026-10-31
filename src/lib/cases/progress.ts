import type { AdminSubmissionRow, AdminWorkspaceState } from '../program/admin.ts';

export type CaseStatus = 'all' | 'complete' | 'in_progress' | 'not_started';
export const caseFilters: { value: CaseStatus; label: string }[] = [
  { value: 'all', label: 'All participants' },
  { value: 'complete', label: 'Complete' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'not_started', label: 'Not started' },
];

export function caseStatus(value: string | null | undefined, legacyStatus?: string | null): CaseStatus {
  return caseFilters.find(f => f.value === value)?.value ?? (legacyStatus === 'complete' ? 'complete' : 'all');
}

export function caseParticipants(rows: readonly AdminSubmissionRow[], progress: AdminWorkspaceState['caseProgress']) {
  const runs = new Map(progress?.map(run => [`${run.assignmentId}:${run.enrollmentId}`, run]));
  const priority = { complete: 0, in_progress: 1, not_started: 2 };
  return rows.map(row => {
    const run = runs.get(`${row.assignment.id}:${row.enrollment.id}`);
    const status: Exclude<CaseStatus, 'all'> = run?.completedAt ? 'complete' : run?.answered ? 'in_progress' : 'not_started';
    return { enrollmentId: row.enrollment.id, person: row.person, answered: run?.answered ?? 0, completedAt: run?.completedAt, status };
  }).toSorted((a, b) => priority[a.status] - priority[b.status] || (a.person?.fullName ?? '').localeCompare(b.person?.fullName ?? '') || a.enrollmentId.localeCompare(b.enrollmentId));
}

export function filterCaseParticipants(rows: ReturnType<typeof caseParticipants>, status: CaseStatus, search: string) {
  const query = search.trim().toLowerCase();
  return rows.filter(row => (status === 'all' || row.status === status) &&
    (!query || `${row.person?.fullName ?? ''} ${row.person?.email ?? ''}`.toLowerCase().includes(query)));
}
