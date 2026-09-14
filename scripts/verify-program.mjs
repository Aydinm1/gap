import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const exec = promisify(execFile);
const { stdout } = await exec('./node_modules/.bin/supabase', ['status','-o','json']);
const config = JSON.parse(stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1', 'Tests must use local Supabase');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth:{ persistSession:false,autoRefreshToken:false } });
const anonymous = createClient(config.API_URL,config.ANON_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
const q = value => `'${String(value).replaceAll("'","''")}'`;
async function sql(text) {
  const { stdout } = await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',text]);
  return stdout.trim();
}
const fixtures = [];
const cohortId = randomUUID();
const weekId = randomUUID();
const draftId = randomUUID();
const assignmentId = randomUUID();
async function fixture(role='member', { active=true,google=true,approved=true,domain='ucdavis.edu' }={}) {
  const email = `gap-test-${randomUUID()}@${domain}`;
  const { data, error } = await admin.auth.admin.createUser({ email,email_confirm:true });
  assert.ifError(error);
  const userId=data.user.id, personId=randomUUID();
  fixtures.push({ userId,personId });
  if (google) await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider) values (${q(userId)},${q(userId)},jsonb_build_object('sub',${q(userId)},'email',${q(email)},'email_verified',true),'google')`);
  await sql(`insert into public.people(id,email,full_name) values (${q(personId)},${q(email)},'Integration Test');`);
  if(approved) await sql(`insert into public.approved_members(person_id,email,full_name,role,active) values (${q(personId)},${q(email)},'Integration Test',${q(role)},${active});`);
  const { data:link,error:linkError } = await admin.auth.admin.generateLink({ type:'magiclink',email });
  assert.ifError(linkError);
  const client=createClient(config.API_URL,config.ANON_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
  // Auth-issued fixture session, not a fake application identity or password-login route.
  const { error:sessionError } = await client.auth.verifyOtp({ token_hash:link.properties.hashed_token,type:'magiclink' });
  assert.ifError(sessionError);
  return { client,personId,userId,email };
}
const ok = result => { assert.ifError(result.error); return result.data; };

test('local Supabase Auth, API policies and persistent program mutations',async t => {
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values (${q(cohortId)},'winter',2999,'2999-01-01','2999-03-01','active');
      insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values
      (${q(weekId)},${q(cohortId)},1,'Test Week','Published test instructions',true),
      (${q(draftId)},${q(cohortId)},2,'Draft title','SECRET DRAFT',false);
      insert into public.assignments(id,week_id,title,instructions,due_at) values (${q(assignmentId)},${q(weekId)},'Test assignment','Submit a link',now()+interval '1 day');`);
    const lead=await fixture('admin'), member=await fixture(), other=await fixture();
    const inactive=await fixture('member',{ active:false }),wrong=await fixture('member',{ domain:'example.com' });
    const unapproved=await fixture('member',{ approved:false }),nongoogle=await fixture('member',{ google:false });
    for(const person of [member,other]) ok(await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:person.personId,cohortId}}));
    await t.test('verified identities require current active roster and Google identity',async () => {
      assert.equal(ok(await lead.client.rpc('sync_profile'))[0].role,'admin');
      assert.equal(ok(await member.client.rpc('sync_profile'))[0].role,'member');
      for(const client of [anonymous,inactive.client,wrong.client,unapproved.client,nongoogle.client]) assert.ok((await client.rpc('sync_profile')).error);
      for(const client of [anonymous,member.client,inactive.client]) assert.ok((await client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:cohortId,state:'archived'}})).error);
    });
    await t.test('draft catalog reveals no draft payload; member reads are isolated',async () => {
      const catalog=ok(await member.client.rpc('week_catalog',{p_cohort_id:cohortId}));
      assert.equal(catalog.length,2);
      assert.equal(catalog[1].title,'Draft title');
      assert.ok(!('description' in catalog[1]));
      assert.equal(ok(await member.client.from('program_weeks').select('*').eq('id',draftId)).length,0);
      assert.equal(ok(await member.client.from('people').select('*').eq('id',other.personId)).length,0);
      assert.ok((await member.client.schema('private').from('monday_application_links').select('*')).error);
      assert.ok((await member.client.from('approved_members').update({role:'admin'}).eq('person_id',member.personId)).error);
    });
    let current;
    await t.test('link submissions persist, preserve history, and reject duplicates/stale reviews',async () => {
      const concurrent=await Promise.all(Array.from({length:4},()=>member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/first'})));
      assert.equal(concurrent.filter(r=>!r.error).length,1);
      current=ok(await member.client.from('submissions').select('*').eq('assignment_id',assignmentId).eq('is_current',true).single());
      assert.equal(ok(await other.client.from('submissions').select('*').eq('id',current.id)).length,0);
      assert.ok((await member.client.from('submissions').insert({assignment_id:assignmentId,enrollment_id:current.enrollment_id,submission_type:'file',file_path:'fake',original_filename:'fake.pdf'})).error);
      const replaced=ok(await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/revised',p_expected_id:current.id,p_expected_updated_at:current.updated_at}));
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'review',p_data:{id:current.id,status:'completed',expectedUpdatedAt:current.updated_at}})).error);
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.equal(ok(await member.client.from('submissions').select('*').eq('assignment_id',assignmentId)).length,2);
      ok(await lead.client.rpc('admin_mutate',{p_action:'review',p_data:{id:current.id,status:'revision_requested',feedback:'Add a source.',expectedUpdatedAt:current.updated_at}}));
      assert.ok((await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/stale',p_expected_id:current.id,p_expected_updated_at:current.updated_at})).error);
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.equal(current.feedback,'Add a source.');
      ok(await lead.client.rpc('admin_mutate',{p_action:'review',p_data:{id:current.id,status:'completed',expectedUpdatedAt:current.updated_at}}));
      current=ok(await member.client.from('submissions').select('*').eq('id',replaced).single());
      assert.ok((await member.client.rpc('submit_link',{p_assignment_id:assignmentId,p_url:'https://example.com/closed',p_expected_id:current.id,p_expected_updated_at:current.updated_at})).error);
    });
    await t.test('publishing validates and retains assignments with history; failures roll back',async () => {
      const base={id:weekId,title:'Test Week',description:'Updated instructions',publicationState:'published',resources:[]};
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:base})).error);
      assert.equal(ok(await lead.client.from('program_weeks').select('description').eq('id',weekId).single()).description,'Published test instructions');
      ok(await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{...base,assignment:{title:'Test assignment',instructions:'New instructions',dueAt:new Date().toISOString()}}}));
      assert.equal(ok(await member.client.from('program_weeks').select('description').eq('id',weekId).single()).description,'Updated instructions');
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{id:draftId,title:'Draft title',description:'',publicationState:'published',resources:[]}})).error);
    });
    await t.test('roster changes override stale profiles and existing sessions',async () => {
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.personId)}`);
      assert.ok((await lead.client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:cohortId,state:'archived'}})).error);
      await sql(`update public.approved_members set active=false where person_id=${q(member.personId)}`);
      assert.ok((await member.client.rpc('sync_profile')).error);
      assert.equal(ok(await member.client.from('submissions').select('*')).length,0);
      ok(await other.client.auth.signOut());
      assert.ok((await other.client.rpc('sync_profile')).error);
    });
  } finally {
    await sql(`delete from public.submissions where assignment_id=${q(assignmentId)} and supersedes_submission_id is not null;
      delete from public.submissions where assignment_id=${q(assignmentId)};
      delete from public.assignments where week_id=${q(weekId)};
      delete from public.program_weeks where cohort_id=${q(cohortId)};
      delete from public.cohort_enrollments where cohort_id=${q(cohortId)};
      delete from public.program_cohorts where id=${q(cohortId)};`);
    for(const f of fixtures) {
      await admin.auth.admin.deleteUser(f.userId);
      await sql(`delete from public.approved_members where person_id=${q(f.personId)};delete from public.people where id=${q(f.personId)};`);
    }
  }
});
