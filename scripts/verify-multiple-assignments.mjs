import assert from 'node:assert/strict';
import test from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {pdf} from '../test/upload-fixtures.mjs';
const exec=promisify(execFile);
const config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=r=>{assert.ifError(r.error);return r.data;};
const q=s=>`'${String(s).replaceAll("'","''")}'`;
async function sql(s){return(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();}
const cohort=randomUUID(),week=randomUUID(),otherWeek=randomUUID(),first=randomUUID(),second=randomUUID(),foreign=randomUUID(),users=[];
async function fixture(role){
 const email=`gap-multi-test-${randomUUID()}@ucdavis.edu`,person=randomUUID();
 const user=ok(await admin.auth.admin.createUser({email,email_confirm:true})).user;users.push({id:user.id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at) values(${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now(),now());
 insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Multi Test');insert into public.approved_members(person_id,email,full_name,role) values(${q(person)},${q(email)},'Multi Test',${q(role)});insert into public.cohort_enrollments(cohort_id,person_id) values(${q(cohort)},${q(person)});`);
 const link=ok(await admin.auth.admin.generateLink({type:'magiclink',email}));const client=createClient(config.API_URL,config.ANON_KEY,options);
 ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));ok(await client.rpc('sync_profile'));return{id:user.id,person,client};
}
const item=(id,title)=>({id,title,instructions:'Read and submit a link',dueAt:'2090-05-01T20:00:00Z'});
const payload=assignments=>({id:week,title:'Multi week',description:'Two assignments',publicationState:'published',assignments,resources:[]});
const rows=async()=>ok(await admin.from('assignments').select('*').eq('week_id',week).order('sort_order'));
async function current(client,id){return ok(await client.from('submissions').select('*').eq('assignment_id',id).eq('is_current',true).single());}
async function jar(u){const cookies=new Map();const session=ok(await u.client.auth.getSession()).session;const db=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>cookies.set(c.name,c.value))}});ok(await db.auth.setSession(session));return cookies;}
test('multiple assignments preserve independent history and require all approvals',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'spring',2988,'2988-04-01','2988-06-01','active');
  insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Multi week','Disposable',true),(${q(otherWeek)},${q(cohort)},2,'Other week','Disposable',false);
  insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(first)},${q(week)},'First brief','First instructions',now()),(${q(foreign)},${q(otherWeek)},'Foreign brief','Private',now());`);
  const lead=await fixture('admin'),member=await fixture('member');
  let document;
  await t.test('adding assignments retains existing IDs/PDF; invalid collections roll back',async()=>{
   document=ok(await admin.rpc('assignment_brief',{p_actor:lead.id,p_action:'prepare',p_data:{assignmentId:first,name:'first.pdf',size:pdf.length}}));
   ok(await lead.client.storage.from('assignment-briefs').upload(document.path,pdf,{contentType:'application/pdf'}));
   ok(await admin.rpc('assignment_brief',{p_actor:lead.id,p_action:'finalize',p_id:document.id,p_data:{size:pdf.length}}));
   const data=payload([item(first,'First brief'),item(second,'Second brief')]);
   for(const client of [anon,member.client])assert.ok((await client.rpc('admin_mutate',{p_action:'week',p_data:data})).error);
   ok(await lead.client.rpc('admin_mutate',{p_action:'week',p_data:data}));
   assert.deepEqual((await rows()).map(a=>a.id),[first,second]);
   const stale=await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{...payload([item(first,'Stale first')]),expectedAssignmentIds:[first]}});
   assert.equal(stale.error?.code,'40001');assert.equal((await rows()).length,2);
   assert.equal(ok(await lead.client.storage.from('assignment-briefs').download(document.path)).size,pdf.length);
   for(const assignments of [[item(first,'Changed'),item(foreign,'Forged')],[item(first,'Changed'),item(first,'Duplicate')],[item(first,'Changed'),{...item(second,'Second'),dueAt:'invalid'}],[item(second,'Only second')]]){
    assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:payload(assignments)})).error);
    assert.equal((await rows())[0].title,'First brief');assert.equal((await rows()).length,2);
   }
   assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:{...payload([]),assignments:undefined,assignment:item(first,'Old client')}})).error);
  });
  await t.test('submissions, reviews and replacement versions remain assignment-scoped',async()=>{
   ok(await member.client.rpc('submit_link',{p_assignment_id:first,p_url:'https://example.com/first'}));
   ok(await member.client.rpc('submit_link',{p_assignment_id:second,p_url:'https://example.com/second'}));
   let a=await current(member.client,first),b=await current(member.client,second);
   ok(await lead.client.rpc('review_submission',{p_data:{id:a.id,status:'completed',expectedUpdatedAt:a.updated_at,feedback:'First approved'}}));
   assert.equal((await current(member.client,first)).status,'completed');assert.equal((await current(member.client,second)).status,'submitted');
   assert.ok((await member.client.rpc('submit_link',{p_assignment_id:second,p_url:'https://example.com/forged',p_expected_id:a.id,p_expected_updated_at:a.updated_at})).error);
   ok(await lead.client.rpc('review_submission',{p_data:{id:b.id,status:'revision_requested',expectedUpdatedAt:b.updated_at,feedback:'Revise second'}}));
   b=await current(member.client,second);
   ok(await member.client.rpc('submit_link',{p_assignment_id:second,p_url:'https://example.com/second-revised',p_expected_id:b.id,p_expected_updated_at:b.updated_at}));
   assert.equal(ok(await member.client.from('submissions').select('id').eq('assignment_id',second)).length,2);
   assert.ok((await lead.client.rpc('admin_mutate',{p_action:'week',p_data:payload([item(first,'First only')])})).error);
  });
  if(process.env.GAP_TEST_APP_URL)await t.test('desktop/phone member review selects the right assignment and completion',async()=>{
   const{chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
   try{for(const width of [1280,390]){
    const adminCtx=await browser.newContext({viewport:{width,height:900}});await adminCtx.addCookies([...(await jar(lead))].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));const editor=await adminCtx.newPage();editor.setDefaultTimeout(15000);
    await editor.goto(`${process.env.GAP_TEST_APP_URL}/admin/weeks/${week}?cohort=${cohort}`);
    await editor.getByRole('button',{name:'Add assignment',exact:true}).click();
    const card=editor.getByRole('heading',{name:'Assignment 3',exact:true}).locator('../..');
    await card.getByLabel('Title',{exact:true}).fill('Temporary third');await card.getByLabel('Instructions',{exact:true}).fill('Temporary instructions');
    await editor.getByRole('button',{name:'Save changes',exact:true}).click();await editor.getByText('Week published.',{exact:true}).waitFor();
    await editor.reload();assert.equal((await rows()).length,3);
    editor.once('dialog',dialog=>dialog.accept());
    await editor.getByRole('heading',{name:'Assignment 3',exact:true}).locator('../..').getByRole('button',{name:'Remove assignment',exact:true}).click();
    await editor.getByRole('button',{name:'Save changes',exact:true}).click();await editor.getByText('Week published.',{exact:true}).waitFor();
    assert.deepEqual((await rows()).map(a=>a.id),[first,second]);
    await editor.goto(`${process.env.GAP_TEST_APP_URL}/admin?cohort=${cohort}&assignment=${second}`);
    assert.equal(await editor.getByLabel('Assignment',{exact:true}).inputValue(),second);
    await editor.getByRole('heading',{name:'Week 1: Second brief',exact:true}).waitFor();
    await adminCtx.close();
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies([...(await jar(member))].map(([name,value])=>({name,value,url:process.env.GAP_TEST_APP_URL})));const page=await ctx.newPage();page.setDefaultTimeout(15000);
    await page.goto(`${process.env.GAP_TEST_APP_URL}/`);await page.getByText(/1 of 2 assignments complete$/).waitFor();
    await page.goto(`${process.env.GAP_TEST_APP_URL}/week/1`);await page.getByRole('heading',{name:'First brief',exact:true}).waitFor();await page.getByRole('heading',{name:'Second brief',exact:true}).waitFor();
    await page.goto(`${process.env.GAP_TEST_APP_URL}/week/1/submission?assignment=${second}`);await page.getByRole('heading',{name:'Second brief',exact:true}).waitFor();
    assert.equal(await page.getByText('First approved',{exact:true}).count(),0);
    const b=await current(member.client,second);ok(await lead.client.rpc('review_submission',{p_data:{id:b.id,status:'completed',expectedUpdatedAt:b.updated_at,feedback:'Second approved'}}));
    await page.goto(`${process.env.GAP_TEST_APP_URL}/`);await page.getByText(/2 of 2 assignments complete$/).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    // Restore pending review so the next width verifies the transition again.
    const reviewed=await current(member.client,second);ok(await lead.client.rpc('review_submission',{p_data:{id:reviewed.id,status:'submitted',expectedUpdatedAt:reviewed.updated_at}}));
    await ctx.close();
   }}finally{await browser.close();}
  });
 }finally{
  const paths=await sql(`select path from public.assignment_documents where assignment_id in (${q(first)},${q(second)})`);if(paths)ok(await admin.storage.from('assignment-briefs').remove(paths.split('\n')));
  await sql(`update public.assignment_documents set expected_id=null where assignment_id in (${q(first)},${q(second)});delete from public.assignment_documents where assignment_id in (${q(first)},${q(second)});delete from public.submissions where assignment_id in (${q(first)},${q(second)});delete from public.assignments where week_id in (${q(week)},${q(otherWeek)});delete from public.program_weeks where cohort_id=${q(cohort)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const u of users){await sql(`delete from public.profiles where id=${q(u.id)};delete from public.approved_members where person_id=${q(u.person)};delete from public.people where id=${q(u.person)}`);ok(await admin.auth.admin.deleteUser(u.id));}
 }
});
