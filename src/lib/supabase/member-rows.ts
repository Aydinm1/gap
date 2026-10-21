import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { readPages } from './pagination.ts';
import { compareCohorts } from '../program/state.ts';

/** Called only after server authorization, with the caller's RLS-scoped client. */
export async function readMemberRows(db: SupabaseClient<Database>, personId: string) {
  const enrollments = await readPages((from, to) => db.from('cohort_enrollments')
    .select('*').eq('person_id', personId).eq('participation_status', 'enrolled').order('id').range(from, to));
  // Fetch qualifying cohorts per enrollment to avoid an unbounded URL-sized IN list.
  const cohorts = (await Promise.all(enrollments.data.map(async enrollment => {
    const result = await db.from('program_cohorts').select('*').eq('id', enrollment.cohort_id).eq('state', 'active').maybeSingle();
    if (result.error) throw new Error('Program could not be loaded. Please try again.');
    return result.data;
  }))).filter(row => row !== null);
  const cohort = cohorts.sort(compareCohorts).at(-1);
  const enrollment = enrollments.data.find(row => row.cohort_id === cohort?.id);
  if (!cohort || !enrollment) return { cohort: undefined, enrollment: undefined, weeks: [], resources: [], assignments: [], submissions: [], catalog: [] };
  const [weeks, submissions, catalog] = await Promise.all([
    readPages((from, to) => db.from('program_weeks').select('*').eq('cohort_id', cohort.id).eq('published', true).order('id').range(from, to)),
    readPages((from, to) => db.from('submissions').select('*').eq('enrollment_id', enrollment.id).order('submitted_at', { ascending: false }).order('id').range(from, to)),
    db.rpc('week_catalog', { p_cohort_id: cohort.id }),
  ]);
  if (catalog.error) throw new Error('Program modules could not be loaded.');
  const ids = weeks.data.map(row => row.id); // At most six published weeks.
  const [resources, assignments] = ids.length ? await Promise.all([
    readPages((from, to) => db.from('resources').select('*').in('week_id', ids).order('sort_order').order('created_at').order('id').range(from, to)),
    readPages((from, to) => db.from('assignments').select('*').in('week_id', ids).order('id').range(from, to)),
  ]) : [{ data: [] }, { data: [] }];
  return { cohort, enrollment, weeks: weeks.data, resources: resources.data, assignments: assignments.data, submissions: submissions.data, catalog: catalog.data ?? [] };
}
