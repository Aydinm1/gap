import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

// Explicit integration suite; only operate on a labeled disposable container.
const container = process.env.GAP_TEST_CONTAINER;
if (!container) throw new Error('Set GAP_TEST_CONTAINER to the labeled disposable PostgreSQL container.');
const database = `gap_test_${randomUUID().replaceAll('-', '')}`;
function command(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', value => { out += value; });
    child.stderr.on('data', value => { err += value; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
    child.stdin.end(input);
  });
}
function sql(query, db = database) {
  return command(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'], query);
}
const cohort = '00000000-0000-0000-0000-000000000001';
const nextCohort = '00000000-0000-0000-0000-000000000002';
const quote = value => value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
function enrollment(email, item = null, target = cohort) {
  const ref = item === null ? '' : `, 'account', 'board', ${quote(item)}`;
  return `select row_to_json(r) from private.enroll_in_gap(${quote(email)}, 'Test Participant', '${target}'${ref}) r;`;
}
async function enroll(email, item = null, target = cohort) {
  const out = await sql(`set role service_role; ${enrollment(email, item, target)}`);
  return JSON.parse(out.split('\n').at(-1));
}

test('enrollment migrations and authorization on a clean PostgreSQL database', async t => {
  assert.equal(await command(['inspect', '--format', '{{index .Config.Labels "gap.test"}}', container]), 'enrollment');
  // Supabase supplies these roles. This isolated PostgreSQL fixture supplies only roles,
  // not simulated auth logic; real Auth/PostgREST verification remains a separate gate.
  await sql(`do $$ begin
    if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end $$; create database ${database};`, 'postgres');
  try {
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(name => /^20260914000[12]_.*\.sql$/.test(name)).sort()) {
      await sql(await readFile(new URL(name, directory), 'utf8'));
    }
    await sql(`insert into public.program_cohorts(id, quarter, year, starts_on, ends_on) values
      ('${cohort}', 'fall', 2026, '2026-09-01', '2026-12-01'),
      ('${nextCohort}', 'winter', 2027, '2027-01-01', '2027-03-01');`);

    await t.test('normalizes identity; repeated requests preserve IDs and timestamps', async () => {
      const first = await enroll('  First@ucdavis.edu ', 'first');
      const before = await sql('select row_to_json(r) from private.monday_application_links r');
      const repeat = await enroll('first@ucdavis.edu', 'first');
      assert.equal(first.created, true);
      assert.deepEqual(repeat, { ...first, created: false });
      assert.equal(await sql('select row_to_json(r) from private.monday_application_links r'), before);
    });
    await t.test('optional and multiple application links; returning participants retain history', async () => {
      await sql("insert into public.people(email,full_name) values ('manual@ucdavis.edu','Existing Person');");
      const manual = await enroll('manual@ucdavis.edu');
      assert.equal(await sql(`select full_name from public.people where id='${manual.person_id}'`), 'Existing Person');
      assert.equal((await enroll('manual@ucdavis.edu', 'manual1')).enrollment_id, manual.enrollment_id);
      assert.equal((await enroll('manual@ucdavis.edu', 'manual2')).enrollment_id, manual.enrollment_id);
      await sql(`update public.cohort_enrollments set participation_status='completed',
        advancement_status='promoted', promotion_response='joined' where id='${manual.enrollment_id}';
        update public.approved_members set role='admin' where person_id='${manual.person_id}';`);
      await enroll('manual@ucdavis.edu', 'manual1');
      const returning = await enroll('manual@ucdavis.edu', 'returning', nextCohort);
      assert.equal(returning.person_id, manual.person_id);
      assert.notEqual(returning.enrollment_id, manual.enrollment_id);
      assert.equal(await sql(`select participation_status||'/'||advancement_status||'/'||promotion_response
        from public.cohort_enrollments where id='${manual.enrollment_id}'`), 'completed/promoted/joined');
      assert.equal(await sql(`select role from public.approved_members where person_id='${manual.person_id}'`), 'admin');
    });
    await t.test('conflicting applications and invalid inputs do not provision', async () => {
      await assert.rejects(enroll('other@ucdavis.edu', 'first'), /conflict/);
      await assert.rejects(enroll('first@ucdavis.edu', 'first', nextCohort), /conflict/);
      await assert.rejects(enroll('invalid@example.com'), /Valid UC Davis/);
      await assert.rejects(enroll('missing@ucdavis.edu', null, randomUUID()), /does not exist/);
      await assert.rejects(sql(`set role service_role; select * from private.enroll_in_gap('partial@ucdavis.edu','Test','${cohort}','account');`), /all three/);
      assert.equal(await sql("select count(*) from public.people where email in ('other@ucdavis.edu','missing@ucdavis.edu','partial@ucdavis.edu')"), '0');
    });
    await t.test('inactive access and withdrawn outcomes cannot be reset by enrollment', async () => {
      const person = await enroll('inactive@ucdavis.edu', 'inactive');
      await sql(`update public.approved_members set active=false where person_id='${person.person_id}';`);
      await assert.rejects(enroll('inactive@ucdavis.edu', 'inactive'), /inactive/);
      await assert.rejects(enroll('inactive@ucdavis.edu', 'inactive-return', nextCohort), /inactive/);
      assert.equal(await sql(`select count(*) from public.cohort_enrollments where person_id='${person.person_id}'`), '1');
      const withdrawn = await enroll('withdrawn@ucdavis.edu');
      await sql(`update public.cohort_enrollments set participation_status='withdrew' where id='${withdrawn.enrollment_id}'`);
      await enroll('withdrawn@ucdavis.edu');
      assert.equal(await sql(`select participation_status from public.cohort_enrollments where id='${withdrawn.enrollment_id}'`), 'withdrew');
    });
    await t.test('late failure rolls back person, roster, enrollment and mapping', async () => {
      const before = await sql('select count(*) from public.cohort_enrollments');
      await sql(`create function private.test_fail_link() returns trigger language plpgsql as $$
        begin raise exception 'Injected link failure'; end $$;
        create trigger test_fail before insert on private.monday_application_links
        for each row execute function private.test_fail_link();`);
      try {
        await assert.rejects(enroll('rollback@ucdavis.edu', 'rollback'), /Injected link failure/);
        assert.equal(await sql("select count(*) from public.people where email='rollback@ucdavis.edu'"), '0');
        assert.equal(await sql("select count(*) from public.approved_members where email='rollback@ucdavis.edu'"), '0');
        assert.equal(await sql('select count(*) from public.cohort_enrollments'), before);
        assert.equal(await sql("select count(*) from private.monday_application_links where item_id='rollback'"), '0');
      } finally {
        await sql('drop trigger test_fail on private.monday_application_links; drop function private.test_fail_link();');
      }
    });
    await t.test('concurrent retries create exactly one enrollment', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, () => enroll('parallel@ucdavis.edu', 'parallel')));
      assert.equal(results.filter(row => row.created).length, 1);
      assert.equal(new Set(results.map(row => row.enrollment_id)).size, 1);
      const links = await Promise.all(['parallel2','parallel3'].map(item => enroll('parallel@ucdavis.edu', item)));
      assert.ok(links.every(row => row.enrollment_id === results[0].enrollment_id && !row.created));
      const conflicts = await Promise.allSettled(['race1@ucdavis.edu','race2@ucdavis.edu'].map(email => enroll(email, 'race')));
      assert.equal(conflicts.filter(row => row.status === 'fulfilled').length, 1);
      assert.equal(await sql("select count(*) from public.people where email in ('race1@ucdavis.edu','race2@ucdavis.edu')"), '1');
    });
    await t.test('database roles deny browser access, including forged admin claims', async () => {
      for (const role of ['anon', 'authenticated']) {
        await assert.rejects(sql(`set role ${role}; select set_config('request.jwt.claims','{"role":"service_role","user_metadata":{"role":"admin"}}',false); ${enrollment('denied@ucdavis.edu')}`), /permission denied/);
        await assert.rejects(sql(`set role ${role}; select * from private.monday_application_links;`), /permission denied/);
        await assert.rejects(sql(`set role ${role}; insert into public.people(email,full_name) values ('denied@ucdavis.edu','Denied');`), /permission denied/);
      }
      await assert.rejects(sql("set role service_role; update private.monday_application_links set item_id='moved';"), /permission denied/);
      assert.equal(await sql("select count(*) from public.people where email='denied@ucdavis.edu'"), '0');
      assert.equal(await sql("select count(*) from pg_class where relname in ('people','approved_members','program_cohorts','cohort_enrollments','monday_application_links') and relrowsecurity"), '5');
    });
    await t.test('uniqueness and RLS remain effective independently of entry-point checks', async () => {
      await assert.rejects(sql(`insert into private.monday_application_links(account_id,board_id,item_id,enrollment_id)
        select account_id,board_id,item_id,enrollment_id from private.monday_application_links limit 1;`), /unique constraint/);
      await assert.rejects(sql(`insert into public.cohort_enrollments(person_id,cohort_id)
        select person_id,cohort_id from public.cohort_enrollments limit 1;`), /unique constraint/);
      // Temporarily grant SELECT inside a rolled-back transaction to exercise RLS itself.
      const result = await sql(`begin; grant usage on schema private to authenticated;
        grant select on private.monday_application_links, public.people to authenticated;
        set local role authenticated;
        select (select count(*) from private.monday_application_links) + (select count(*) from public.people);
        rollback;`);
      assert.equal(result.split('\n').at(-2), '0');
    });
  } finally {
    // The unique database was created by this test; no existing database is touched.
    await sql(`drop database ${database};`, 'postgres');
  }
});
