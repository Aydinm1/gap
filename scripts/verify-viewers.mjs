import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { pdf } from '../test/upload-fixtures.mjs';
const exec=promisify(execFile),config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),archive=randomUUID(),draftCohort=randomUUID(),week=randomUUID(),locked=randomUUID(),oldWeek=randomUUID(),secretWeek=randomUUID(),assignment=randomUUID(),oldAssignment=randomUUID(),users=[],extraPeople=[];
const app=process.env.GAP_TEST_APP_URL;if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',{active=true,approved=true,domain='ucdavis.edu',target}={}){
 const email=`gap-viewer-test-${randomUUID()}@${domain}`,person=randomUUID();
 const user=ok(await root.auth.admin.createUser({email,email_confirm:true})).user;users.push({id:user.id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now());insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Viewer Test');${approved?`insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Viewer Test',${q(role)},${active});`:''}${target?`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(person)},${q(target)});`:''}`);
 const link=ok(await root.auth.admin.generateLink({type:'magiclink',email})),client=createClient(config.API_URL,config.ANON_KEY,options);ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));if(approved&&active&&domain==='ucdavis.edu')ok(await client.rpc('sync_profile'));return{id:user.id,person,email,client};
}
async function jar(user){const cookies=new Map(),session=ok(await user.client.auth.getSession()).session;const ssr=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>cookies.set(c.name,c.value))}});ok(await ssr.auth.setSession(session));return cookies;}
async function action(name,args,cookies=new Map()){
 const manifest=JSON.parse(await readFile(process.env.GAP_TEST_ACTION_MANIFEST||'.next/server/server-reference-manifest.json','utf8')),id=Object.entries(manifest.node).find(([,e])=>e.exportedName===name)?.[0];assert.ok(id,`Missing ${name}`);
 const r=await fetch(`${app}/explore`,{method:'POST',redirect:'manual',headers:{'next-action':id,'content-type':'text/plain;charset=UTF-8',origin:app,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(args)});return{body:await r.text(),redirect:r.headers.get('x-action-redirect')??''};
}
const snapshot=()=>sql(`select jsonb_build_object('enrollments',(select coalesce(jsonb_agg(e order by id),'[]') from public.cohort_enrollments e where cohort_id in(${q(cohort)},${q(archive)})),'submissions',(select coalesce(jsonb_agg(s order by id),'[]') from public.submissions s where assignment_id in(${q(assignment)},${q(oldAssignment)})),'attendance',(select count(*) from public.attendance_records r join public.attendance_sessions s on s.id=r.session_id where s.week_id in(${q(week)},${q(oldWeek)})))`);
test('Viewer access is content-only and independent of cohort participation',async t=>{
 let brief,privateFile,pending,session;
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'fall',2985,'2985-09-01','2985-12-01','active'),(${q(archive)},'spring',2985,'2985-04-01','2985-06-01','archived'),(${q(draftCohort)},'winter',2986,'2986-01-01','2986-03-01','draft');
   insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Viewer workshop','Published viewer content',true),(${q(locked)},${q(cohort)},2,'Upcoming viewer week','TOP SECRET DRAFT',false),(${q(oldWeek)},${q(archive)},1,'Archived workshop','Published archive content',true),(${q(secretWeek)},${q(draftCohort)},1,'Draft cohort secret','PRIVATE COHORT',true);
   insert into public.assignments(id,week_id,title,instructions,instructions_format,due_at) values(${q(assignment)},${q(week)},'Viewer assignment','## Research\n\n- **Evidence** first','markdown',now()-interval '1 day'),(${q(oldAssignment)},${q(oldWeek)},'Archived assignment','Old published brief','plain',now());
   insert into public.resources(week_id,title,resource_type,url,sort_order) values(${q(week)},'Workshop materials','workshop','https://example.com/workshop',1),(${q(locked)},'Secret material','workshop','https://example.com/secret',1);`);
  const lead=await fixture('admin'),member=await fixture('member',{target:cohort});await fixture('member',{target:cohort});
  for(let n=0;n<22;n++){const id=randomUUID();extraPeople.push(id);await sql(`insert into public.people(id,email,full_name) values(${q(id)},${q(`gap-viewer-roster-${id}@ucdavis.edu`)},'Fictional analyst');insert into public.cohort_enrollments(person_id,cohort_id) values(${q(id)},${q(cohort)});`);}
  const before=await snapshot(),viewer=await fixture('viewer'),inactive=await fixture('viewer',{active:false}),wrong=await fixture('viewer',{domain:'example.com'}),unapproved=await fixture('member',{approved:false});
  await t.test('new viewers do not change 24 participants, completion/review records or attendance',async()=>{
   assert.equal(await snapshot(),before);assert.equal(await sql(`select count(*) from public.cohort_enrollments where cohort_id=${q(cohort)}`),'24');
   assert.equal(ok(await viewer.client.rpc('sync_profile'))[0].role,'viewer');assert.equal(ok(await viewer.client.from('cohort_enrollments').select('*')).length,0);
   assert.equal(ok(await viewer.client.from('people').select('*')).length,1);
  });
  await t.test('only active viewers read published active/archived content, never drafts or classmates',async()=>{
   const cohorts=ok(await viewer.client.from('program_cohorts').select('id'));assert.ok(cohorts.some(c=>c.id===cohort));assert.ok(cohorts.some(c=>c.id===archive));assert.ok(!cohorts.some(c=>c.id===draftCohort));
   assert.equal(ok(await viewer.client.from('program_weeks').select('*').eq('id',locked)).length,0);assert.equal(ok(await viewer.client.from('resources').select('*').eq('week_id',locked)).length,0);
   const catalog=ok(await viewer.client.rpc('week_catalog',{p_cohort_id:cohort}));assert.equal(catalog.length,2);assert.deepEqual(Object.keys(catalog[0]).sort(),['cohort_id','id','published','title','week_number']);
   assert.equal(ok(await viewer.client.rpc('week_catalog',{p_cohort_id:draftCohort})).length,0);
   for(const client of [inactive.client,wrong.client,unapproved.client])assert.equal(ok(await client.from('program_weeks').select('id').eq('id',week)).length,0);
   assert.ok((await anon.from('program_weeks').select('*')).error);
   assert.equal(ok(await member.client.from('program_weeks').select('id').eq('id',oldWeek)).length,0);
   brief=ok(await root.rpc('assignment_brief',{p_actor:lead.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'Viewer assignment.pdf',size:pdf.length}}));
   ok(await lead.client.storage.from('assignment-briefs').upload(brief.path,pdf,{contentType:'application/pdf'}));ok(await root.rpc('assignment_brief',{p_actor:lead.id,p_action:'finalize',p_id:brief.id,p_data:{size:pdf.length}}));
   assert.equal(ok(await viewer.client.storage.from('assignment-briefs').download(brief.path)).size,pdf.length);
   await sql(`update public.program_weeks set published=false where id=${q(week)}`);assert.ok((await viewer.client.storage.from('assignment-briefs').download(brief.path)).error);await sql(`update public.program_weeks set published=true where id=${q(week)}`);
  });
  await t.test('manual/Monday enrollment and role conversion preserve history and return actionable errors',async()=>{
   const before=await snapshot();assert.match((await lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:viewer.person,cohortId:cohort}})).error.message,/Change Viewer/);
   assert.match((await lead.client.rpc('admin_mutate',{p_action:'roster',p_data:{id:ok(await lead.client.from('approved_members').select('id').eq('person_id',member.person).single()).id,email:member.email,fullName:'Viewer Test',role:'viewer',active:true}})).error.message,/Resolve current/);
   const row={id:'fixture-viewer-item',name:'Viewer Test',email:viewer.email,checked:true,cohortKey:'fall',cohortLabel:'Fall'};
   let batch=ok(await root.rpc('monday_import',{p_actor:lead.id,p_action:'stage',p_data:{account:'viewer-fixture',board:'viewer-fixture',rows:[row]}}));
   batch=ok(await root.rpc('monday_import',{p_actor:lead.id,p_action:'map',p_batch:batch.id,p_data:{fall:cohort}}));assert.equal(batch.rows[0].eligibility,'blocked');assert.match(batch.rows[0].reason,/Viewer/);
   const result=ok(await root.rpc('monday_import',{p_actor:lead.id,p_action:'process',p_batch:batch.id,p_data:row}));assert.equal(result.status,'blocked');assert.match(result.message,/Viewer/);
   await sql(`delete from private.monday_import_batches where id=${q(batch.id)}`);assert.equal(await snapshot(),before);
  });
  await t.test('concurrent role conversion and enrollment cannot create a current Viewer participant',async()=>{
   const candidate=await fixture('member'),roster=ok(await lead.client.from('approved_members').select('id').eq('person_id',candidate.person).single());
   await Promise.all([
    lead.client.rpc('admin_mutate',{p_action:'enroll',p_data:{personId:candidate.person,cohortId:cohort}}),
    lead.client.rpc('admin_mutate',{p_action:'roster',p_data:{id:roster.id,email:candidate.email,fullName:'Viewer Test',role:'viewer',active:true}}),
   ]);
   assert.equal(await sql(`select count(*) from public.approved_members m join public.cohort_enrollments e on e.person_id=m.person_id where m.person_id=${q(candidate.person)} and m.role='viewer' and e.participation_status='enrolled'`),'0');
   await sql(`delete from public.cohort_enrollments where person_id=${q(candidate.person)}`);
  });
  const former=await fixture('member',{target:cohort});
  await t.test('historical enrollments never grant a viewer work, upload, feedback or attendance access',async()=>{
   const retained=await fixture('member',{target:archive});
   await sql(`update public.approved_members set role='viewer' where person_id=${q(retained.person)};update public.program_cohorts set state='active' where id=${q(archive)}`);
   assert.equal(ok(await retained.client.from('cohort_enrollments').select('*')).length,0);
   assert.ok((await retained.client.rpc('submit_link',{p_assignment_id:oldAssignment,p_url:'https://example.com/retained'})).error);
   await sql(`update public.approved_members set active=false where person_id=${q(retained.person)};update public.program_cohorts set state='archived' where id=${q(archive)}`);
   privateFile=ok(await root.rpc('file_upload',{p_actor:former.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'private.pdf',size:pdf.length,mime:'application/pdf'}}));
   ok(await former.client.storage.from('submissions').upload(privateFile.path,pdf,{contentType:'application/pdf'}));ok(await root.rpc('file_upload',{p_actor:former.id,p_action:'finalize',p_intent:privateFile.id,p_data:{size:pdf.length,mime:'application/pdf'}}));
   const current=ok(await former.client.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).single());
   pending=ok(await root.rpc('file_upload',{p_actor:former.id,p_action:'prepare',p_data:{assignmentId:assignment,name:'pending.pdf',size:pdf.length,mime:'application/pdf',expectedId:current.id,expectedUpdatedAt:current.updated_at}}));
   ok(await lead.client.rpc('attendance',{p_action:'open',p_data:{weekId:week,workshopDate:'2026-10-22'}}));session=ok(await lead.client.rpc('attendance',{p_action:'admin_read',p_data:{cohortId:cohort}})).sessions[0];ok(await former.client.rpc('attendance',{p_action:'check_in',p_data:{sessionId:session.id,code:session.code}}));
   await sql(`update public.cohort_enrollments set participation_status='completed' where person_id=${q(former.person)};update public.approved_members set role='viewer' where person_id=${q(former.person)}`);
   assert.equal(ok(await former.client.from('submissions').select('*')).length,0);assert.equal(ok(await former.client.from('cohort_enrollments').select('*')).length,0);assert.equal(ok(await former.client.from('attendance_records').select('*')).length,0);assert.equal(ok(await former.client.from('attendance_sessions').select('*')).length,0);assert.ok((await former.client.storage.from('submissions').download(privateFile.path)).error);
   for(const client of [viewer.client,former.client]){
    assert.ok((await client.rpc('submit_link',{p_assignment_id:assignment,p_url:'https://example.com/forged'})).error);assert.ok((await client.rpc('submit_text',{p_assignment_id:assignment,p_text:'forged'})).error);
    assert.ok((await client.rpc('attendance',{p_action:'check_in',p_data:{sessionId:session.id,code:session.code}})).error);
    assert.ok((await client.rpc('admin_mutate',{p_action:'cohort_state',p_data:{id:cohort,state:'archived'}})).error);
    for(const operation of ['prepare','get','cancel','finalize'])assert.ok((await root.rpc('file_upload',{p_actor:former.id,p_action:operation,p_intent:pending.id,p_data:{assignmentId:assignment,name:'x.pdf',mime:'application/pdf',size:pdf.length}})).error);
   }
   assert.ok((await former.client.storage.from('submissions').upload(pending.path,pdf,{contentType:'application/pdf'})).error);
   assert.equal(await sql(`select count(*) from public.submissions where enrollment_id in(select id from public.cohort_enrollments where person_id=${q(former.person)})`),'1');
  });
  await t.test('HTTP actions/routes enforce viewer role and live deactivation',{skip:!app},async()=>{
   const cookies=await jar(viewer),input=[assignment,'https://example.com/forged'];
   for(const [name,args] of [['saveLink',input],['saveText',[assignment,'forged']],['prepareUpload',[assignment,{name:'test.pdf',size:pdf.length,type:'application/pdf'}]],['cancelUpload',[pending.id]],['finalizeUpload',[pending.id]],['saveAdmin',['enroll',{personId:viewer.person,cohortId:cohort}]],['saveAttendance',[{action:'check_in',sessionId:session.id,code:session.code}]],['mondayImport',['preview']]])assert.match((await action(name,args,cookies)).redirect,/access-denied/);
   assert.match((await action('saveText',[assignment,'anon'])).redirect,/login/);
   const headers={cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')};assert.equal((await fetch(`${app}/api/assignment-briefs/${brief.id}/download`,{headers})).status,200);
   for(const identity of [inactive,wrong,unapproved]){
    const identityCookies=await jar(identity),response=await fetch(`${app}/explore?cohort=${cohort}`,{redirect:'manual',headers:{cookie:[...identityCookies].map(([k,v])=>`${k}=${v}`).join('; ')}});assert.match((response.headers.get('location')??'')+await response.text(),/access-denied/);
   }
   await sql(`update public.approved_members set role='member' where person_id=${q(viewer.person)}`);
   const revoked=await fetch(`${app}/explore`,{headers,redirect:'manual'});assert.match((revoked.headers.get('location')??'')+await revoked.text(),/access-denied/);
   await sql(`update public.approved_members set role='viewer' where person_id=${q(viewer.person)}`);
   await sql(`update public.approved_members set active=false where person_id=${q(viewer.person)}`);assert.match((await action('saveText',[assignment,'inactive'],cookies)).redirect,/access-denied/);assert.equal((await fetch(`${app}/api/assignment-briefs/${brief.id}/download`,{headers})).status,404);await sql(`update public.approved_members set active=true where person_id=${q(viewer.person)}`);
  });
  await t.test('desktop/phone published browsing, cohort switcher and non-saving practice',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-viewer-browser-'));
   try{
    const adminContext=await browser.newContext();await adminContext.addCookies([...(await jar(lead))].map(([name,value])=>({name,value,url:app})));const adminPage=await adminContext.newPage();
    const email=`gap-viewer-ui-${randomUUID()}@ucdavis.edu`,beforeProvision=await snapshot();
    try{
     await adminPage.goto(`${app}/admin/members?cohort=${cohort}`);await adminPage.getByRole('button',{name:'Portal access',exact:true}).click();await adminPage.getByRole('button',{name:'Add roster member',exact:true}).click();
     await adminPage.getByLabel('Full name',{exact:true}).fill('Board Viewer Test');await adminPage.getByLabel('UC Davis email',{exact:true}).fill(email);await adminPage.getByRole('combobox',{name:/^Role/}).selectOption('viewer');await adminPage.getByRole('button',{name:'Add to roster',exact:true}).click();await adminPage.getByText(email,{exact:false}).waitFor();
     assert.equal(await snapshot(),beforeProvision);assert.equal(await sql(`select role from public.approved_members where email=${q(email)}`),'viewer');
    }finally{await sql(`delete from public.approved_members where email=${q(email)};delete from public.people where email=${q(email)}`);await adminContext.close();}
    for(const width of [1280,390]){
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies([...(await jar(viewer))].map(([name,value])=>({name,value,url:app})));const page=await ctx.newPage();page.setDefaultTimeout(20000);
    const before=await snapshot();const activityManifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),activityAction=Object.entries(activityManifest.node).find(([,e])=>e.exportedName==='recordActivity')?.[0];let writes=0;page.on('request',r=>{if(r.method()!=='GET' && r.headers()['next-action']!==activityAction)writes++;});
    await page.goto(`${app}/`);await page.waitForURL('**/explore');await page.getByRole('heading',{name:'Explore GAP',exact:true}).waitFor();
    await page.goto(`${app}/explore?cohort=${cohort}`);await page.getByRole('link',{name:/Week 1 Viewer workshop/}).click();await page.getByRole('link',{name:/View assignment:/}).click();await page.getByRole('heading',{name:'Viewer assignment',exact:true}).waitFor();
    for(const label of ['Overdue','Not submitted','Your submission'])assert.equal(await page.getByText(label,{exact:true}).count(),0);
    await page.getByRole('button',{name:'Try submission preview',exact:true}).click();await page.getByRole('button',{name:/^Write response/}).click();await page.getByLabel('Your response',{exact:true}).fill('Local board practice');
    await page.getByRole('button',{name:/^Upload file/}).click();await page.getByLabel('Choose file',{exact:true}).setInputFiles({name:'practice.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByRole('button',{name:/^Submit link/}).click();await page.getByLabel('Submission link',{exact:true}).fill('https://example.com/practice');assert.ok(await page.getByRole('button',{name:'Submit assignment',exact:true}).isDisabled());
    assert.equal(writes,0);assert.equal(await snapshot(),before);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(screens,`practice-${width}.png`),fullPage:true});
    page.once('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'Try submission preview',exact:true}).click();await page.getByRole('button',{name:/^Write response/}).click();assert.equal(await page.getByLabel('Your response',{exact:true}).inputValue(),'');
    await page.goto(`${app}/explore?cohort=${cohort}`);await page.getByRole('button',{name:/Browsing cohort/}).click();await page.getByRole('button',{name:'Spring 2985',exact:true}).click();await page.getByRole('link',{name:/Week 1 Archived workshop/}).waitFor();assert.ok(page.url().includes(archive));
    await page.goto(`${app}/explore/week/2?cohort=${cohort}`);assert.ok(!(await page.content()).includes('TOP SECRET DRAFT'));
    for(const path of ['/admin','/admin/preview','/admin/attendance']){await page.goto(`${app}${path}`);await page.waitForURL('**/access-denied');}
    const memberCtx=await browser.newContext();await memberCtx.addCookies([...(await jar(member))].map(([name,value])=>({name,value,url:app})));const memberPage=await memberCtx.newPage();await memberPage.goto(`${app}/explore`);await memberPage.waitForURL('**/access-denied');await memberCtx.close();
    await ctx.close();assert.equal(await snapshot(),before);
   }console.log(`Viewer browser screenshots: ${screens}`);}finally{await browser.close();}
  });
 }finally{
  const paths=await sql(`select path from public.assignment_documents where assignment_id in(${q(assignment)},${q(oldAssignment)})`);if(paths)ok(await root.storage.from('assignment-briefs').remove(paths.split('\n')));
  const uploads=await sql(`select path from private.upload_intents where assignment_id in(${q(assignment)},${q(oldAssignment)})`);if(uploads)ok(await root.storage.from('submissions').remove(uploads.split('\n')));
  await sql(`delete from private.monday_import_batches where owner_id in(${users.map(u=>q(u.id)).join(',')||'null'});delete from private.attendance_history where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from private.attendance_attempts where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from public.attendance_records where session_id in(select id from public.attendance_sessions where week_id=${q(week)});delete from public.attendance_sessions where week_id=${q(week)};delete from private.upload_intents where assignment_id in(${q(assignment)},${q(oldAssignment)});update public.submissions set supersedes_submission_id=null where assignment_id in(${q(assignment)},${q(oldAssignment)});delete from public.submissions where assignment_id in(${q(assignment)},${q(oldAssignment)});delete from public.assignment_documents where assignment_id in(${q(assignment)},${q(oldAssignment)});delete from public.assignments where week_id in(${q(week)},${q(oldWeek)});delete from public.program_weeks where cohort_id in(${q(cohort)},${q(archive)},${q(draftCohort)});delete from public.cohort_enrollments where cohort_id in(${q(cohort)},${q(archive)},${q(draftCohort)});delete from public.program_cohorts where id in(${q(cohort)},${q(archive)},${q(draftCohort)});`);
  for(const user of users){await sql(`delete from public.profiles where id=${q(user.id)};delete from public.approved_members where person_id=${q(user.person)};delete from public.people where id=${q(user.person)}`);ok(await root.auth.admin.deleteUser(user.id));}
  for(const id of extraPeople)await sql(`delete from public.people where id=${q(id)}`);
  assert.equal(await sql(`select count(*) from public.program_cohorts where id in(${q(cohort)},${q(archive)},${q(draftCohort)})`),'0');
 }
});
