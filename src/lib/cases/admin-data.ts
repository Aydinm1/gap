import 'server-only';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { CaseExercise } from './types';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function readAdminCaseResponse(assignmentId: string, enrollmentId: string, cohortId?: string) {
  await requireUser(true);
  if (!uuid.test(assignmentId) || !uuid.test(enrollmentId) || (cohortId !== undefined && !uuid.test(cohortId))) notFound();
  const db = await createClient();
  const [assignment, enrollment] = await Promise.all([
    db.from('assignments').select('id,title,week_id,workflow').eq('id', assignmentId).maybeSingle(),
    db.from('cohort_enrollments').select('id,person_id,cohort_id,is_test').eq('id', enrollmentId).maybeSingle(),
  ]);
  if (assignment.error || enrollment.error) throw new Error('Could not load case responses. Please retry.');
  if (!assignment.data || assignment.data.workflow !== 'cases' || !enrollment.data) notFound();
  const week = await db.from('program_weeks').select('id,cohort_id,week_number').eq('id', assignment.data.week_id).maybeSingle();
  if (week.error) throw new Error('Could not load case responses. Please retry.');
  if (!week.data || week.data.cohort_id !== enrollment.data.cohort_id || (cohortId && cohortId !== week.data.cohort_id)) notFound();
  const [person, exercise] = await Promise.all([
    db.from('people').select('full_name,email').eq('id', enrollment.data.person_id).maybeSingle(),
    db.rpc('read_case_exercise', { p_assignment: assignmentId, p_enrollment: enrollmentId }),
  ]);
  if (person.error || exercise.error) throw new Error('Could not load case responses. Please retry.');
  if (!person.data) notFound();
  return { assignment: assignment.data, enrollment: enrollment.data, week: week.data, person: person.data, exercise: exercise.data as unknown as CaseExercise };
}
