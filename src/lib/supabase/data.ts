import 'server-only';
import { cache } from 'react';
import { createClient } from './server';
import { requireUser } from './auth';
import type { AdminWorkspaceState, AdminWeek } from '@/lib/program/admin';
import type { CohortEnrollment, ProgramWeek, Resource, SubmissionAttempt } from '@/lib/program/types';
import { compareCohorts } from '@/lib/program/state';
import { buildWeekDetail } from '@/lib/program/week-detail';

export const readWorkspace = cache(async (admin = false) => {
  const user = await requireUser(admin);
  const db = await createClient();
  const [people, roster, cohorts, enrollments, weeks, resources, assignments, submissions] = await Promise.all([
    db.from('people').select('*'), db.from('approved_members').select('*'), db.from('program_cohorts').select('*'),
    db.from('cohort_enrollments').select('*'), db.from('program_weeks').select('*'), db.from('resources').select('*').order('sort_order').order('created_at'),
    db.from('assignments').select('*'), db.from('submissions').select('*').order('submitted_at', { ascending: false }),
  ]);
  if ([people,roster,cohorts,enrollments,weeks,resources,assignments,submissions].some(result => result.error)) throw new Error('GAP data could not be loaded. Please try again.');
  const state: AdminWorkspaceState = {
    people: (people.data ?? []).map(r => ({ id:r.id,email:r.email,fullName:r.full_name })),
    approvedMembers: (roster.data ?? []).map(r => ({ id:r.id,personId:r.person_id,email:r.email,fullName:r.full_name,role:r.role,active:r.active })),
    cohorts: (cohorts.data ?? []).map(r => ({ id:r.id,quarter:r.quarter,year:r.year,startsOn:r.starts_on,endsOn:r.ends_on,state:r.state })),
    enrollments: (enrollments.data ?? []).map(r => ({ id:r.id,cohortId:r.cohort_id,personId:r.person_id,participationStatus:r.participation_status,advancementStatus:r.advancement_status,...(r.promotion_response ? { promotionResponse:r.promotion_response } : {}) }) as CohortEnrollment),
    weeks: (weeks.data ?? []).map((r): AdminWeek => {
      const a = assignments.data?.find(a => a.week_id === r.id);
      return { id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:r.title,description:r.description,publicationState:r.published?'published':'draft',slidesUrl:r.slides_url ?? undefined,
        resources:(resources.data ?? []).filter(a => a.week_id === r.id).map(a => ({ id:a.id,title:a.title,description:a.description ?? undefined,type:a.resource_type as Resource['type'],url:a.url,sortOrder:a.sort_order })),
        assignment:a ? { id:a.id,weekNumber:r.week_number,title:a.title,instructions:a.instructions,dueAt:a.due_at } : undefined };
    }),
    submissions:(submissions.data ?? []).map((r): SubmissionAttempt => ({ id:r.id,assignmentId:r.assignment_id,enrollmentId:r.enrollment_id,status:r.status,submittedAt:r.submitted_at,updatedAt:r.updated_at,isCurrent:r.is_current,feedback:r.feedback ?? undefined,reviewedAt:r.reviewed_at ?? undefined,reviewedByUserId:r.reviewed_by ?? undefined,supersedesSubmissionId:r.supersedes_submission_id ?? undefined,
      payload:r.submission_type==='link' ? { type:'link',submittedUrl:r.submitted_url! } : { type:'file',filePath:r.file_path!,originalFilename:r.original_filename! } })),
  };
  return { user, state };
});

export const readMember = cache(async () => {
  const { user, state } = await readWorkspace();
  const cohort = state.cohorts.filter(c => c.state==='active' && state.enrollments.some(e => e.cohortId===c.id && e.personId===user.personId && e.participationStatus==='enrolled')).toSorted(compareCohorts).at(-1);
  const enrollment = state.enrollments.find(e => e.cohortId===cohort?.id && e.personId===user.personId && e.participationStatus==='enrolled');
  const db = await createClient();
  const catalog = cohort ? await db.rpc('week_catalog',{ p_cohort_id:cohort.id }) : null;
  if (catalog?.error) throw new Error('Program modules could not be loaded.');
  const weeks: ProgramWeek[] = (catalog?.data ?? []).map((r: { id:string;cohort_id:string;week_number:number;title:string;published:boolean }) => {
    const full = state.weeks.find(w => w.id===r.id);
    if (r.published && full) return { ...full,publicationState:'published' };
    return { id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:r.title,publicationState:'draft' };
  });
  return { user,cohort,enrollment,weeks,submissions:state.submissions.filter(s => s.enrollmentId===enrollment?.id),now:new Date().toISOString() };
});

export async function readWeek(weekNumber: string) {
  const data = await readMember();
  if (!data.cohort || !data.enrollment) return null;
  const detail = buildWeekDetail({ ...data,weekNumber,cohortId:data.cohort.id,enrollmentId:data.enrollment.id,now:new Date(data.now) });
  return detail ? { ...detail,enrollmentId:data.enrollment.id } : null;
}
