import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import { requireUser } from './auth';
import type { AdminWorkspaceState, AdminWeek } from '@/lib/program/admin';
import type { CohortEnrollment, ProgramWeek, Resource, SubmissionAttempt, CohortTeam, MemberTeam } from '@/lib/program/types';
import { readMemberRows } from './member-rows';
import { buildWeekDetail } from '@/lib/program/week-detail';
import { readPages } from './pagination';

export const readWorkspace = cache(async (admin = true) => {
  const user = await requireUser(admin);
  const db = await createClient();
  const [people, roster, cohorts, enrollments, weeks, resources, assignments, submissions, documents] = await Promise.all([
    readPages((from, to) => db.from('people').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('approved_members').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('program_cohorts').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('cohort_enrollments').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('program_weeks').select('*').order('id').range(from, to)),
    readPages((from, to) => db.from('resources').select('*').order('sort_order').order('created_at').order('id').range(from, to)),
    readPages((from, to) => db.from('assignments').select('*').order('sort_order').order('id').range(from, to)),
    readPages((from, to) => db.from('submissions').select('*').order('submitted_at', { ascending: false }).order('id').range(from, to)),
    readPages((from, to) => db.from('assignment_documents').select('*').eq('is_current', true).eq('state', 'ready').order('id').range(from, to)),
  ]);
  const activity = admin ? await readPages((from,to)=>db.rpc('admin_activity').order('person_id').range(from,to)) : {data:[]};
  const [teamRows, memberships] = await Promise.all([
    readPages((from,to)=>db.from('cohort_teams').select('*').order('id').range(from,to)),
    readPages((from,to)=>db.from('team_memberships').select('*').order('enrollment_id').range(from,to)),
  ]);
  const completionCredits = await readPages((from,to)=>db.from('assignment_completions').select('*').is('revoked_at',null).order('id').range(from,to));
  const teams: CohortTeam[] = teamRows.data.map(t=>({id:t.id,cohortId:t.cohort_id,name:t.name,isTest:t.is_test,version:t.version,locked:t.locked,enrollmentIds:memberships.data.filter(m=>m.team_id===t.id).map(m=>m.enrollment_id)}));
  const state: AdminWorkspaceState = {
    completionCredits: completionCredits.data.map(r=>({id:r.id,assignmentId:r.assignment_id,enrollmentId:r.enrollment_id,grantedAt:r.granted_at,grantedBy:r.granted_by})),
    teams,
    people: (people.data ?? []).map(r => ({ id:r.id,email:r.email,fullName:r.full_name })),
    approvedMembers: (roster.data ?? []).map(r => ({ id:r.id,personId:r.person_id,email:r.email,fullName:r.full_name,role:r.role,active:r.active,lastActiveAt:activity.data.find(a=>a.person_id===r.person_id)?.last_active_at })),
    cohorts: (cohorts.data ?? []).map(r => ({ id:r.id,quarter:r.quarter,year:r.year,startsOn:r.starts_on,endsOn:r.ends_on,state:r.state })),
    enrollments: (enrollments.data ?? []).map(r => ({ id:r.id,cohortId:r.cohort_id,personId:r.person_id,participationStatus:r.participation_status,isTest:r.is_test,advancementStatus:r.advancement_status,...(r.promotion_response ? { promotionResponse:r.promotion_response } : {}) }) as CohortEnrollment),
    weeks: (weeks.data ?? []).map((r): AdminWeek => {
      const weekAssignments = assignments.data.filter(a => a.week_id === r.id).map(a => {
        const document = documents.data.find(d => d.assignment_id === a.id);
        return { id:a.id,submissionMode:a.submission_mode as 'individual'|'team',weekNumber:r.week_number,title:a.title,instructions:a.instructions,summary:a.summary ?? undefined,instructionsFormat:a.instructions_format as 'plain' | 'markdown',dueAt:a.due_at,document:document ? { id:document.id,name:document.original_filename } : undefined };
      });
      return { id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:r.title,description:r.description,publicationState:r.published?'published':'draft',slidesUrl:r.slides_url ?? undefined,
        resources:(resources.data ?? []).filter(a => a.week_id === r.id).map(a => ({ id:a.id,title:a.title,description:a.description ?? undefined,type:a.resource_type as Resource['type'],url:a.url,sortOrder:a.sort_order })),
        assignments:weekAssignments };
    }),
    submissions:(submissions.data ?? []).map((r): SubmissionAttempt => ({ id:r.id,assignmentId:r.assignment_id,enrollmentId:r.enrollment_id ?? undefined,targetId:r.target_id,teamId:r.team_id ?? undefined,participantEnrollmentIds:teams.find(t=>t.id===r.team_id)?.enrollmentIds,submittedByName:people.data.find(p=>p.id===r.submitted_by)?.full_name,status:r.status,submittedAt:r.submitted_at,updatedAt:r.updated_at,isCurrent:r.is_current,feedback:r.feedback ?? undefined,reviewedAt:r.reviewed_at ?? undefined,reviewedByUserId:r.reviewed_by ?? undefined,supersedesSubmissionId:r.supersedes_submission_id ?? undefined,
      payload:r.submission_type==='text' ? { type:'text',submittedText:r.submitted_text! } : r.submission_type==='link' ? { type:'link',submittedUrl:r.submitted_url! } : { type:'file',filePath:r.file_path!,originalFilename:r.original_filename! } })),
  };
  return { user, state };
});

export const readMember = cache(async () => {
  const user = await requireUser();
  if (user.role === 'viewer') redirect('/explore');
  const db = await createClient();
  const rows = await readMemberRows(db, user.personId);
  const team = rows.team as MemberTeam | undefined;
  const c = rows.cohort, e = rows.enrollment;
  const cohort = c ? { id:c.id,quarter:c.quarter,year:c.year,startsOn:c.starts_on,endsOn:c.ends_on,state:c.state } : undefined;
  const enrollment: CohortEnrollment | undefined = e ? { id:e.id,cohortId:e.cohort_id,personId:e.person_id,participationStatus:e.participation_status,advancementStatus:e.advancement_status,...(e.promotion_response ? { promotionResponse:e.promotion_response } : {}) } as CohortEnrollment : undefined;
  const weeks: ProgramWeek[] = rows.catalog.map(r => {
    const full = rows.weeks.find(w => w.id===r.id);
    const assignments = rows.assignments.filter(a => a.week_id===r.id).map(a => {
      const document = rows.documents.find(d => d.assignment_id === a.id);
      const credit = rows.completionCredits.find(credit=>credit.assignment_id===a.id);
      return { id:a.id,completionCredit:credit?{id:credit.id,grantedAt:credit.granted_at}:undefined,submissionMode:a.submission_mode as 'individual'|'team',team:a.submission_mode==='team'?team:undefined,weekNumber:r.week_number,title:a.title,instructions:a.instructions,summary:a.summary ?? undefined,instructionsFormat:a.instructions_format as 'plain' | 'markdown',dueAt:a.due_at,document:document ? { id:document.id,name:document.original_filename } : undefined };
    });
    if (r.published && full) return { id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:full.title,description:full.description,publicationState:'published',slidesUrl:full.slides_url ?? undefined,
      resources:rows.resources.filter(a => a.week_id===r.id).map(a => ({ id:a.id,title:a.title,description:a.description ?? undefined,type:a.resource_type as Resource['type'],url:a.url,sortOrder:a.sort_order })),
      assignments };
    return { id:r.id,cohortId:r.cohort_id,weekNumber:r.week_number,title:r.title,publicationState:'draft' };
  });
  const submissions: SubmissionAttempt[] = rows.submissions.map(r => ({ id:r.id,assignmentId:r.assignment_id,enrollmentId:r.enrollment_id ?? undefined,targetId:r.target_id,teamId:r.team_id ?? undefined,participantEnrollmentIds:r.team_id===team?.id?team?.members.map(m=>m.enrollmentId):undefined,submittedByName:team?.members.find(m=>m.personId===r.submitted_by)?.name ?? (r.enrollment_id===e?.id?user.fullName:undefined),status:r.status,submittedAt:r.submitted_at,updatedAt:r.updated_at,isCurrent:r.is_current,feedback:r.feedback ?? undefined,reviewedAt:r.reviewed_at ?? undefined,reviewedByUserId:r.reviewed_by ?? undefined,supersedesSubmissionId:r.supersedes_submission_id ?? undefined,
    payload:r.submission_type==='text' ? { type:'text',submittedText:r.submitted_text! } : r.submission_type==='link' ? { type:'link',submittedUrl:r.submitted_url! } : { type:'file',filePath:r.file_path!,originalFilename:r.original_filename! } }));
  return { user,cohort,enrollment,weeks,submissions,now:new Date().toISOString() };
});

export async function readWeek(weekNumber: string) {
  const data = await readMember();
  if (!data.cohort || !data.enrollment) return null;
  const detail = buildWeekDetail({ ...data,weekNumber,cohortId:data.cohort.id,enrollmentId:data.enrollment.id,now:new Date(data.now) });
  return detail ? { ...detail,enrollmentId:data.enrollment.id } : null;
}
