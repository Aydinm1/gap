import type { AdminWorkspaceState } from './admin.ts';
import type { ProgramUser, ProgramWeek, CohortEnrollment, SubmissionAttempt } from './types.ts';

/** Display-only context: never persisted or accepted by a mutation. */
export function buildAdminPreview(state: AdminWorkspaceState, user: ProgramUser, requestedId?: string) {
  const cohort = requestedId ? state.cohorts.find(c => c.id === requestedId)
    : state.cohorts.find(c => c.state === 'active') ?? state.cohorts[0];
  if (!cohort) return null;
  const weeks: ProgramWeek[] = state.weeks.filter(w => w.cohortId === cohort.id).map(w =>
    w.publicationState === 'published' ? { ...w } : {
      id: w.id, cohortId: w.cohortId, weekNumber: w.weekNumber, title: w.title, publicationState: 'draft',
    });
  // Selectors require enrollment context; this ID cannot identify a real enrollment.
  const enrollment: CohortEnrollment = { id: 'admin-preview', personId: user.personId,
    cohortId: cohort.id, participationStatus: 'enrolled', advancementStatus: 'pending' };
  return { user, cohort, enrollment, weeks, submissions: [] as SubmissionAttempt[] };
}
