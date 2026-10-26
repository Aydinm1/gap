import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {pdf} from '../test/upload-fixtures.mjs';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,opts),anon=createClient(config.API_URL,config.ANON_KEY,opts);
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),users=[],extra=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role,{enrolled=false,active=true}={}){
 const email=`gap-test-participation-${randomUUID()}@ucdavis.edu`,person=randomUUID(),id=ok(await root.auth.admin.createUser({email,email_confirm:true})).user.id;
 users.push({id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},jsonb_build_object('sub',${q(id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Test Participant Fixture');insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Test Participant Fixture',${q(role)},${active});${enrolled?`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(person)},${q(cohort)});`:''}`);
 const client=createClient(config.API_URL,config.ANON_KEY,opts),link=ok(await root.auth.admin.generateLink({type:'magiclink',email}));ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));if(active)ok(await client.rpc('sync_profile'));
 const enrollment=enrolled?await sql(`select id from public.cohort_enrollments where person_id=${q(person)} and cohort_id=${q(cohort)}`):null;
 return{id,person,email,client,enrollment};
}
async function cookies(user){const jar=new Map(),session=ok(await user.client.auth.getSession()).session,ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>jar.set(c.name,c.value))}});ok(await ssr.auth.setSession(session));return [...jar].map(([name,value])=>({name,value,url:app}));}
async function action(user,data){const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),id=Object.entries(manifest.node).find(([,e])=>e.exportedName==='saveAdmin')?.[0];assert.ok(id);const r=await fetch(`${app}/admin/members`,{method:'POST',headers:{origin:app,'next-action':id,'content-type':'text/plain;charset=UTF-8',cookie:(user?await cookies(user):[]).map(c=>`${c.name}=${c.value}`).join('; ')},body:JSON.stringify(['enrollment_test',data]),redirect:'manual'});return{redirect:r.headers.get('x-action-redirect')??'',body:await r.text()};}
test('test participation preserves real workflows without affecting official totals',async t=>{
 let upload;
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2987,'2987-09-01','2987-12-01','active');insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Test enrollment workshop','Disposable test enrollment content',true);insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(assignment)},${q(week)},'Test enrollment assignment','Submit test work',now()+interval '1 day');`);
  const lead=await fixture('admin'),member=await fixture('member',{enrolled:true}),tester=await fixture('member',{enrolled:true}),viewer=await fixture('viewer'),inactive=await fixture('admin',{active:false});
  for(let n=0;n<23;n++){const id=randomUUID();extra.push(id);await sql(`insert into public.people(id,email,full_name) values(${q(id)},${q(`gap-test-count-${id}@ucdavis.edu`)},'Official fixture');insert into public.cohort_enrollments(person_id,cohort_id) values(${q(id)},${q(cohort)});`);}
  const flag=(client,value)=>client.rpc('set_test_participation',{p_id:tester.enrollment,p_is_test:value});
  await t.test('only live admins set strict flags, preserving role, outcomes, enrollment and retries',async()=>{
   for(const client of [anon,member.client,tester.client,viewer.client,inactive.client])assert.ok((await flag(client,true)).error);
   assert.ok((await lead.client.rpc('set_test_participation',{p_id:tester.enrollment,p_is_test:null})).error);
   assert.ok((await lead.client.rpc('set_test_participation',{p_id:randomUUID(),p_is_test:true})).error);
   assert.ok((await tester.client.from('cohort_enrollments').update({is_test:true}).eq('id',tester.enrollment)).error);
   ok(await flag(lead.client,true));ok(await flag(lead.client,true));
   ok(await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:tester.person,cohortId:cohort}}));
   const e=ok(await tester.client.from('cohort_enrollments').select('*').eq('id',tester.enrollment).single());assert.equal(e.is_test,true);assert.equal(e.participation_status,'enrolled');assert.equal(e.advancement_status,'pending');assert.equal(ok(await tester.client.rpc('sync_profile'))[0].role,'member');
   assert.equal(await sql(`select count(*) from public.cohort_enrollments where cohort_id=${q(cohort)} and not is_test`),'24');
  });
  await t.test('test users submit text/link/file, retain history and receive review/attendance normally',async()=>{
   ok(await tester.client.rpc('submit_link',{p_assignment_id:assignment,p_url:'https://example.com/test'}));
   let current=ok(await tester.client.from('submissions').select('*').eq('enrollment_id',tester.enrollment).eq('is_current',true).single());
   ok(await tester.client.rpc('submit_text',{p_assignment_id:assignment,p_text:'Test written response',p_expected_id:current.id,p_expected_updated_at:current.updated_at}));
   current=ok(await tester.client.from('submissions').select('*').eq('enrollment_id',tester.enrollment).eq('is_current',true).single());
   upload=ok(await root.rpc('file_upload',{p_actor:tester.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'test.pdf',size:pdf.length,mime:'application/pdf',expectedId:current.id,expectedUpdatedAt:current.updated_at}}));ok(await tester.client.storage.from('submissions').upload(upload.path,pdf,{contentType:'application/pdf'}));ok(await root.rpc('file_upload',{p_actor:tester.id,p_action:'finalize',p_intent:upload.id,p_data:{size:pdf.length,mime:'application/pdf'}}));assert.equal(ok(await tester.client.storage.from('submissions').download(upload.path)).size,pdf.length);
   current=ok(await tester.client.from('submissions').select('*').eq('enrollment_id',tester.enrollment).eq('is_current',true).single());
   ok(await lead.client.rpc('review_submission',{p_data:{id:current.id,status:'revision_requested',feedback:'Test feedback',expectedUpdatedAt:current.updated_at}}));assert.equal(ok(await tester.client.from('submissions').select('*').eq('id',current.id).single()).feedback,'Test feedback');
   assert.equal(ok(await tester.client.from('submissions').select('*').eq('enrollment_id',tester.enrollment)).length,3);
   ok(await lead.client.rpc('attendance',{p_action:'open',p_data:{weekId:week,workshopDate:'2026-10-22'}}));const s=ok(await lead.client.rpc('attendance',{p_action:'admin_read',p_data:{cohortId:cohort}})).sessions[0];ok(await tester.client.rpc('attendance',{p_action:'check_in',p_data:{sessionId:s.id,code:s.code}}));
   assert.equal(await sql(`select count(*) from public.attendance_records r join public.cohort_enrollments e on e.id=r.enrollment_id where e.cohort_id=${q(cohort)} and r.present and not e.is_test`),'0');
  });
  await t.test('application mutations reject forged/unauthorized test changes',{skip:!app},async()=>{
   for(const user of [member,tester,viewer,inactive])assert.match((await action(user,{id:tester.enrollment,isTest:false})).redirect,/access-denied/);assert.match((await action(null,{id:tester.enrollment,isTest:false})).redirect,/login/);
   for(const data of [{id:tester.enrollment,isTest:'false'},{id:'forged',isTest:true},{}])assert.match((await action(lead,data)).body,/Invalid test participation/);
   await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);assert.ok((await flag(lead.client,false)).error);assert.match((await action(lead,{id:tester.enrollment,isTest:false})).redirect,/access-denied/);await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
  });
  await t.test('desktop/phone official counts, separated reviews/attendance and reversible flag UI',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-test-participants-'));
   try{for(const width of [1280,390]){
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies(await cookies(lead));const page=await ctx.newPage();page.setDefaultTimeout(20000);
    await page.goto(`${app}/admin?cohort=${cohort}&status=all`);await page.getByRole('heading',{name:'Review queue',exact:true}).waitFor();const summary=page.getByRole('region',{name:'Week overview'});assert.match(await summary.innerText(),/0 submissions received/);assert.ok(!(await page.locator('#submissions').innerText()).includes(tester.email));
    await page.getByRole('button',{name:'Not submitted 24',exact:true}).click();await page.locator('#submissions').getByText('Test Participant Fixture',{exact:true}).filter({visible:true}).first().waitFor();await page.getByRole('button',{name:'All submissions 0',exact:true}).click();await page.getByRole('heading',{name:'No matching submissions',exact:true}).waitFor();assert.equal(await page.getByText('Await submission',{exact:true}).count(),0);
    await page.getByRole('combobox',{name:'Participation view',exact:true}).selectOption('test');await page.getByText(tester.email,{exact:true}).filter({visible:true}).first().waitFor();assert.match(await summary.innerText(),/1 submission received/);await page.getByText('Test submissions only. Excluded from official review counts.',{exact:true}).waitFor();await page.screenshot({path:join(screens,`queue-${width}.png`),fullPage:true});await page.getByRole('link',{name:/^(View →|View submission →|Review submission →)$/}).filter({visible:true}).first().click();await page.getByRole('heading',{name:'Test Participant Fixture',exact:true}).waitFor();assert.match(await page.getByRole('link',{name:'← Review queue',exact:true}).getAttribute('href'),/audience=test/);
    await page.goto(`${app}/admin/attendance?cohort=${cohort}`);await page.getByRole('heading',{name:'Workshop roster · 0 present',exact:true}).waitFor();assert.equal(await page.getByText(tester.email,{exact:true}).count(),0);await page.getByRole('combobox',{name:'Participation view',exact:true}).selectOption('test');await page.getByRole('heading',{name:'Test roster',exact:true}).waitFor();await page.getByText(tester.email,{exact:true}).waitFor();await page.getByRole('button',{name:'Undo',exact:true}).waitFor();
    await page.goto(`${app}/admin/members?cohort=${cohort}`);await page.getByRole('searchbox',{name:'Search members',exact:true}).fill(tester.email);await page.getByRole('button',{name:'Edit outcomes',exact:true}).click();const check=page.getByRole('checkbox',{name:/Test participant/});await check.waitFor();assert.ok(await check.isChecked());page.once('dialog',d=>d.accept());await check.click();await page.getByRole('status').filter({hasText:'Test participation saved.'}).waitFor();await page.reload();await page.getByRole('searchbox',{name:'Search members',exact:true}).fill(tester.email);await page.getByRole('button',{name:'Edit outcomes',exact:true}).click();assert.ok(!(await check.isChecked()));assert.equal(await sql(`select count(*) from public.cohort_enrollments where cohort_id=${q(cohort)} and not is_test`),'25');await check.click();await page.getByRole('status').filter({hasText:'Test participation saved.'}).waitFor();await page.reload();await page.getByRole('searchbox',{name:'Search members',exact:true}).fill(tester.email);await page.getByRole('button',{name:'Edit outcomes',exact:true}).click();assert.ok(await check.isChecked());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`roster-${width}.png`),fullPage:true});await ctx.close();
   }console.log(`Test participation screenshots: ${screens}`);}finally{await browser.close();}
  });
 }finally{
  if(upload)ok(await root.storage.from('submissions').remove([upload.path]));
  await sql(`delete from private.attendance_history where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from private.attendance_attempts where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from public.attendance_records where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from public.attendance_sessions where week_id=${q(week)};delete from private.upload_intents where assignment_id=${q(assignment)};update public.submissions set supersedes_submission_id=null where assignment_id=${q(assignment)};delete from public.submissions where assignment_id=${q(assignment)};delete from public.assignments where id=${q(assignment)};delete from public.program_weeks where cohort_id=${q(cohort)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await root.auth.admin.deleteUser(u.id));}for(const id of extra)await sql(`delete from public.people where id=${q(id)}`);assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
 }
});
