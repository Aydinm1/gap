import { openAssignmentEditor } from './lib/week-editor.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { pdf } from '../test/upload-fixtures.mjs';

const exec = promisify(execFile);
const config = JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options = {auth:{persistSession:false,autoRefreshToken:false}};
const admin = createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const anon = createClient(config.API_URL,config.ANON_KEY,options);
const ok = r => { assert.ifError(r.error); return r.data; };
const q = s => `'${String(s).replaceAll("'","''")}'`;
async function sql(s) {return (await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();}
const cohort=randomUUID(),week=randomUUID(),draftWeek=randomUUID(),assignment=randomUUID(),users=[];
async function fixture(role='member',enroll=true) {
  const email=`gap-brief-test-${randomUUID()}@ucdavis.edu`,person=randomUUID();
  const user=ok(await admin.auth.admin.createUser({email,email_confirm:true})).user;
  users.push({id:user.id,person});
  await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at) values(${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now(),now());
  insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Brief Test');
  insert into public.approved_members(person_id,email,full_name,role) values(${q(person)},${q(email)},'Brief Test',${q(role)});`);
  if(enroll) await sql(`insert into public.cohort_enrollments(cohort_id,person_id) values(${q(cohort)},${q(person)});`);
  const link=ok(await admin.auth.admin.generateLink({type:'magiclink',email}));
  const client=createClient(config.API_URL,config.ANON_KEY,options);
  ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
  ok(await client.rpc('sync_profile'));
  return {id:user.id,person,client};
}
async function rpc(u,action,id,data={}) {return ok(await admin.rpc('assignment_brief',{p_actor:u.id,p_action:action,p_id:id,p_data:data}));}
async function prepare(u,expectedId) {return rpc(u,'prepare',null,{assignmentId:assignment,name:'Week 1 résumé.pdf',size:pdf.length,expectedId});}
async function upload(u,d) {return ok(await u.client.storage.from('assignment-briefs').upload(d.path,pdf,{contentType:'application/pdf'}));}
async function jar(u) {
  const cookies=new Map();const session=ok(await u.client.auth.getSession()).session;
  const ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>cookies.set(c.name,c.value))}});
  ok(await ssr.auth.setSession(session));return cookies;
}
test('assignment briefs and cohort dates use isolated local records',async t=>{
  try {
    await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'spring',2997,'2997-04-01','2997-06-01','active');
    insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Brief test','Disposable',false);
    insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(assignment)},${q(week)},'Brief test','Read the PDF',now());`);
    await sql(`insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(draftWeek)},${q(cohort)},2,'Locked preview week','Draft content',false)`);
    const lead=await fixture('admin',false),member=await fixture(),outsider=await fixture('member',false);
    let first;
    await t.test('live admin required and exact intent paths only',async()=>{
      assert.ok((await anon.rpc('assignment_brief',{p_actor:lead.id,p_action:'prepare'})).error);
      assert.ok((await lead.client.rpc('assignment_brief',{p_actor:lead.id,p_action:'prepare'})).error);
      assert.ok((await admin.rpc('assignment_brief',{p_actor:member.id,p_action:'prepare'})).error);
      first=await prepare(lead);
      assert.ok((await member.client.storage.from('assignment-briefs').upload(first.path,pdf,{contentType:'application/pdf'})).error);
      assert.ok((await lead.client.storage.from('assignment-briefs').upload('forged.pdf',pdf,{contentType:'application/pdf'})).error);
      await upload(lead,first);
      assert.ok((await member.client.storage.from('assignment-briefs').download(first.path)).error);
      assert.equal(ok(await member.client.from('assignment_documents').select('*')).length,0);
      first=await rpc(lead,'finalize',first.id,{size:pdf.length});assert.equal(first.state,'ready');
      assert.deepEqual(await rpc(lead,'finalize',first.id,{size:pdf.length}),first);
      assert.ok((await member.client.storage.from('assignment-briefs').download(first.path)).error,'draft PDF private');
      await sql(`update public.program_weeks set published=true where id=${q(week)}`);
      assert.equal(ok(await member.client.storage.from('assignment-briefs').download(first.path)).size,pdf.length);
      assert.ok((await outsider.client.storage.from('assignment-briefs').download(first.path)).error);
      assert.ok((await anon.storage.from('assignment-briefs').download(first.path)).error);
      await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);
      assert.ok((await member.client.storage.from('assignment-briefs').download(first.path)).error);
      await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
      assert.ok((await lead.client.storage.from('assignment-briefs').upload(first.path,pdf,{contentType:'application/pdf',upsert:true})).error);
      await lead.client.storage.from('assignment-briefs').remove([first.path]);
      assert.equal(ok(await member.client.storage.from('assignment-briefs').download(first.path)).size,pdf.length);
    });
    await t.test('concurrent replacements, cancellation and revoked admin are safe',async()=>{
      const a=await prepare(lead,first.id),b=await prepare(lead,first.id);
      await upload(lead,a);await upload(lead,b);
      const receipts=await Promise.all([rpc(lead,'finalize',a.id,{size:pdf.length}),rpc(lead,'finalize',b.id,{size:pdf.length})]);
      assert.equal(receipts.filter(r=>r.state==='ready').length,1);
      assert.equal(receipts.filter(r=>r.error==='stale').length,1);
      assert.ok((await member.client.storage.from('assignment-briefs').download(first.path)).error,'superseded PDF is admin-only');
      assert.equal(ok(await lead.client.storage.from('assignment-briefs').download(first.path)).size,pdf.length);
      const current=receipts.find(r=>r.state==='ready');
      const pending=await prepare(lead,current.id);
      assert.equal((await rpc(lead,'cancel',pending.id)).state,'abandoned');
      assert.ok((await lead.client.storage.from('assignment-briefs').upload(pending.path,pdf,{contentType:'application/pdf'})).error);
      const expired=await prepare(lead,current.id);
      await sql(`update public.assignment_documents set expires_at=now()-interval '1 second' where id=${q(expired.id)}`);
      assert.ok((await lead.client.storage.from('assignment-briefs').upload(expired.path,pdf,{contentType:'application/pdf'})).error);
      assert.equal((await rpc(lead,'get',expired.id)).state,'abandoned');
      await sql(`update public.approved_members set role='member' where person_id=${q(lead.person)}`);
      assert.ok((await admin.rpc('assignment_brief',{p_actor:lead.id,p_action:'get',p_id:pending.id})).error);
      await sql(`update public.approved_members set role='admin' where person_id=${q(lead.person)}`);
    });
    await t.test('cohort date updates preserve identity and reject unauthorized or inverted dates',async()=>{
      assert.ok((await member.client.rpc('update_cohort_dates',{p_id:cohort,p_starts_on:'2997-04-03',p_ends_on:'2997-06-03'})).error);
      assert.ok((await lead.client.rpc('update_cohort_dates',{p_id:cohort,p_starts_on:'2997-07-01',p_ends_on:'2997-06-03'})).error);
      ok(await lead.client.rpc('update_cohort_dates',{p_id:cohort,p_starts_on:'2997-04-03',p_ends_on:'2997-06-03'}));
      const c=ok(await lead.client.from('program_cohorts').select('*').eq('id',cohort).single());
      assert.equal(c.starts_on,'2997-04-03');assert.equal(c.year,2997);
    });
    if(process.env.GAP_TEST_APP_URL) await t.test('desktop/phone PDF attach, reload and protected download',async()=>{
      const {chromium}=await import('playwright-core');
      const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
      try {
        for(const width of [1280,390]) {
          const ctx=await browser.newContext({viewport:{width,height:900}});
          await ctx.addCookies([...(await jar(lead))].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));
          const page=await ctx.newPage();
          page.setDefaultTimeout(15000);
          const countBefore=await sql(`select count(*) from public.cohort_enrollments where cohort_id=${q(cohort)}`);
          await page.goto(`${process.env.GAP_TEST_APP_URL}/admin/preview?cohort=${cohort}`);
          await page.getByRole('heading',{name:'Member preview',exact:true}).waitFor();
          assert.equal(await page.getByRole('link',{name:'Member portal →',exact:true}).count(),0);
          assert.equal(await page.getByRole('link',{name:'My program →',exact:true}).count(),0);
          assert.equal(await page.getByRole('link',{name:'180 Degrees Consulting UC Davis home',exact:true}).getAttribute('href'),`/admin?cohort=${cohort}`);
          await page.getByRole('link',{name:/Week 1 Brief test/}).click();
          await page.getByRole('link',{name:/^View assignment:/}).click();
          await page.getByRole('button',{name:'Preview submission',exact:true}).click();
          await page.getByRole('note').filter({hasText:'Preview only'}).waitFor();
          assert.equal(await page.getByRole('button',{name:'Submit assignment',exact:true}).isDisabled(),true);
          assert.equal(await sql(`select count(*) from public.cohort_enrollments where cohort_id=${q(cohort)}`),countBefore);
          await sql(`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(lead.person)},${q(cohort)})`);
          await page.reload();
          await page.getByRole('link',{name:'My program →',exact:true}).waitFor();
          await sql(`delete from public.cohort_enrollments where person_id=${q(lead.person)} and cohort_id=${q(cohort)}`);
          await page.reload();
          // Next may have started streaming the admin shell before notFound().
          const locked=await ctx.request.get(`${process.env.GAP_TEST_APP_URL}/admin/preview/week/2?cohort=${cohort}`);assert.match(await locked.text(),/This page could not be found/);
          const missing=await ctx.request.get(`${process.env.GAP_TEST_APP_URL}/admin/preview?cohort=${randomUUID()}`);assert.match(await missing.text(),/This page could not be found/);
          await page.goto(`${process.env.GAP_TEST_APP_URL}/admin/weeks/${week}?cohort=${cohort}`);
          await openAssignmentEditor(page,assignment,'Instructions');await page.waitForFunction(() => { const input=document.querySelector('input[type="file"]');return input && Object.keys(input).some(key=>key.startsWith('__reactProps$')); });
          await page.getByLabel('Choose PDF',{exact:true}).setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
          await page.getByText('Selected: invalid.pdf',{exact:true}).waitFor();
          await page.getByRole('button',{name:'Replace PDF',exact:true}).click();
          await page.getByText('The file is not a valid PDF or its size does not match. Cancel and select a valid PDF.',{exact:true}).waitFor();
          await page.getByRole('button',{name:'Cancel upload',exact:true}).click();
          await page.getByText('Upload canceled.',{exact:true}).waitFor();
          await page.getByLabel('Choose PDF',{exact:true}).setInputFiles({name:`Assignment ${width}.pdf`,mimeType:'application/pdf',buffer:pdf});
          await page.getByText(`Selected: Assignment ${width}.pdf`,{exact:true}).waitFor();
          await page.getByRole('button',{name:'Replace PDF',exact:true}).click();
          await page.getByText('Assignment PDF attached.',{exact:true}).waitFor();
          await page.reload();
          await openAssignmentEditor(page,assignment,'Instructions');const link=page.getByRole('link',{name:`Download Assignment ${width}.pdf`,exact:true});await link.waitFor();
          const href=await link.getAttribute('href');
          const download=await ctx.request.get(new URL(href,process.env.GAP_TEST_APP_URL).toString());assert.equal(download.status(),200);assert.deepEqual(await download.body(),pdf);
          const anonymousDownload=await fetch(new URL(href,process.env.GAP_TEST_APP_URL),{redirect:'manual'});assert.equal(anonymousDownload.status,401);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
          await page.goto(`${process.env.GAP_TEST_APP_URL}/admin/members?cohort=${cohort}`);
          await page.getByRole('button',{name:'Manage cohort',exact:true}).click();
          await page.getByLabel('End date',{exact:true}).fill('2997-06-05');
          await page.getByRole('button',{name:'Save dates',exact:true}).click();
          await page.getByText('Cohort dates saved.',{exact:true}).waitFor();
          await page.reload();await page.getByRole('button',{name:'Manage cohort',exact:true}).click();
          assert.equal(await page.getByLabel('End date',{exact:true}).inputValue(),'2997-06-05');
          // Restore so both widths perform an actual date mutation.
          ok(await lead.client.rpc('update_cohort_dates',{p_id:cohort,p_starts_on:'2997-04-03',p_ends_on:'2997-06-03'}));
          await ctx.close();
          const memberCtx=await browser.newContext({viewport:{width,height:900}});
          await memberCtx.addCookies([...(await jar(member))].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));
          const memberPage=await memberCtx.newPage();memberPage.setDefaultTimeout(15000);await memberPage.goto(`${process.env.GAP_TEST_APP_URL}/week/1`);
          await memberPage.getByRole('link',{name:/^View assignment:/}).click();
          await memberPage.getByRole('link',{name:`Download assignment PDF · Assignment ${width}.pdf`,exact:true}).waitFor();
          await memberPage.goto(`${process.env.GAP_TEST_APP_URL}/admin/preview?cohort=${cohort}`);
          await memberPage.waitForURL(url=>url.pathname==='/access-denied');
          assert.equal(await memberPage.getByRole('heading',{name:'Member preview',exact:true}).count(),0);
          assert.equal((await memberCtx.request.get(new URL(href,process.env.GAP_TEST_APP_URL).toString())).status(),200);
          await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);
          assert.equal((await memberCtx.request.get(new URL(href,process.env.GAP_TEST_APP_URL).toString())).status(),404);
          await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
          await memberCtx.close();
        }
      } finally {await browser.close();}
    });
  } finally {
    const paths=await sql(`select path from public.assignment_documents where assignment_id=${q(assignment)}`);
    if(paths) ok(await admin.storage.from('assignment-briefs').remove(paths.split('\n')));
    await sql(`update public.assignment_documents set expected_id=null where assignment_id=${q(assignment)}; delete from public.assignment_documents where assignment_id=${q(assignment)}; delete from public.assignments where id=${q(assignment)}; delete from public.program_weeks where cohort_id=${q(cohort)}; delete from public.cohort_enrollments where cohort_id=${q(cohort)}; delete from public.program_cohorts where id=${q(cohort)};`);
    for(const u of users) {await sql(`delete from public.profiles where id=${q(u.id)}; delete from public.approved_members where person_id=${q(u.person)}; delete from public.people where id=${q(u.person)}`);ok(await admin.auth.admin.deleteUser(u.id));}
  }
});
