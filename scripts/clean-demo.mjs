// Local-only cleanup. Run without --apply for an inventory and safety check.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const tables = ['people', 'approved_members', 'program_cohorts', 'cohort_enrollments',
  'program_weeks', 'resources', 'assignments', 'submissions', 'profiles'];
const sql = (input) => execFileSync('docker', ['exec', '-i', 'supabase_db_gap',
  'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-At'],
{ input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const snapshotQuery = `select jsonb_build_object(${tables.map(t =>
  `'${t}',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.${t} t)`
).join(',')},'mappings',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from private.monday_application_links t));`;
const snapshot = JSON.parse(sql(snapshotQuery));
const personIds = [1, 2, 3].map(n => `20000000-0000-4000-8000-00000000000${n}`);
const cohortIds = [1, 2].map(n => `10000000-0000-4000-8000-00000000000${n}`);
const has = (ids, id) => ids.includes(id);
const chosen = {};
chosen.people = snapshot.people.filter(r => has(personIds, r.id));
chosen.program_cohorts = snapshot.program_cohorts.filter(r => has(cohortIds, r.id));
chosen.approved_members = snapshot.approved_members.filter(r => has(personIds, r.person_id));
chosen.profiles = snapshot.profiles.filter(r => has(personIds, r.person_id));
chosen.cohort_enrollments = snapshot.cohort_enrollments.filter(r => has(personIds, r.person_id) || has(cohortIds, r.cohort_id));
chosen.program_weeks = snapshot.program_weeks.filter(r => has(cohortIds, r.cohort_id));
const weekIds = chosen.program_weeks.map(r => r.id);
chosen.resources = snapshot.resources.filter(r => has(weekIds, r.week_id));
chosen.assignments = snapshot.assignments.filter(r => has(weekIds, r.week_id));
const assignmentIds = chosen.assignments.map(r => r.id);
const enrollmentIds = chosen.cohort_enrollments.map(r => r.id);
chosen.submissions = snapshot.submissions.filter(r => has(assignmentIds, r.assignment_id) || has(enrollmentIds, r.enrollment_id));

// Fail closed on edited seed rows, extra dependencies, or partially changed datasets.
const counts = Object.fromEntries(tables.map(t => [t, chosen[t].length]));
console.log('Demo inventory:', counts);
if (Object.values(counts).every(n => n === 0)) {
  console.log('No demo records remain. Nothing changed.');
  process.exit(0);
}
assert.deepEqual(counts, { people: 3, approved_members: 3, program_cohorts: 2,
  cohort_enrollments: 6, program_weeks: 12, resources: 0, assignments: 2, submissions: 4, profiles: 0 },
'Unexpected demo dependencies: manual review required.');
assert(!snapshot.mappings.some(r => has(enrollmentIds, r.enrollment_id)), 'Demo enrollment has Monday mappings.');
const seedTime = chosen.people[0].created_at;
for (const [table, rows] of Object.entries(chosen)) {
  for (const row of rows) {
    assert.equal(row.created_at ?? row.submitted_at, seedTime, `${table}: non-seed creation time`);
    assert.equal(row.updated_at, seedTime, `${table}: edited record`);
  }
}
const emails = ['gap.test.admin@ucdavis.edu', 'gap.test.member@ucdavis.edu', 'gap.test.other@ucdavis.edu'];
for (const p of chosen.people) assert.equal(p.email, emails[personIds.indexOf(p.id)]);
for (const e of chosen.cohort_enrollments) {
  assert(has(personIds, e.person_id) && has(cohortIds, e.cohort_id), 'Real participation touches demo data.');
  assert(e.participation_status === 'enrolled' && e.advancement_status === 'pending' && e.promotion_response === null);
}
for (const s of chosen.submissions) {
  assert(has(assignmentIds, s.assignment_id) && has(enrollmentIds, s.enrollment_id));
  assert(s.submitted_url === 'https://example.com/gap-sample' && s.submission_type === 'link');
  assert(s.supersedes_submission_id === null && s.reviewed_by === null && s.reviewed_at === null && s.is_current);
}
assert(!snapshot.submissions.some(s => s.supersedes_submission_id && chosen.submissions.some(d => d.id === s.supersedes_submission_id)), 'Non-seed history references demo work.');
if (!process.argv.includes('--apply')) {
  console.log('Safety checks passed. Use --apply to back up and remove these records.');
  process.exit(0);
}
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const backup = resolve('.local-backups', `demo-cleanup-${Date.now()}`);
mkdirSync(backup, { recursive: true, mode: 0o700 });
writeFileSync(resolve(backup, 'records.json'), JSON.stringify(chosen, null, 2), { mode: 0o600 });
const inserts = tables.filter(t => chosen[t].length).map(t =>
  `insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, ${quote(JSON.stringify(chosen[t]))}::jsonb);`);
writeFileSync(resolve(backup, 'restore.sql'), ['begin;', ...inserts, 'commit;'].join('\n'), { mode: 0o600 });
// Lock before rechecking the entire relevant snapshot to prevent a check/delete race.
const compare = snapshotQuery.replace(/^select /, '').replace(/;$/, '');
const deletionOrder = ['submissions', 'resources', 'assignments', 'program_weeks', 'cohort_enrollments', 'profiles', 'approved_members', 'people', 'program_cohorts'];
sql(`begin;
lock table ${tables.map(t => `public.${t}`).join(',')}, private.monday_application_links in share row exclusive mode;
do $cleanup$ begin
if (${compare}) is distinct from ${quote(JSON.stringify(snapshot))}::jsonb then
raise exception 'Database changed since inventory; cleanup aborted'; end if;
end $cleanup$;
${deletionOrder.filter(t => chosen[t].length).map(t => `delete from public.${t} where id in (${chosen[t].map(r => quote(r.id)).join(',')});`).join('\n')}
commit;`);
console.log(`Removed demo records. Recoverable backup: ${backup}`);
