import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { pdf } from '../test/upload-fixtures.mjs';
const exec=promisify(execFile);
const config=JSON.parse((await exec('./node_modules/.bin/supabase',['status','-o','json'])).stdout);
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const ok=r=>{assert.ifError(r.error);return r.data;},q=s=>`'${String(s).replaceAll("'","''")}'`;
const sql=async s=>(await exec('docker',['exec','supabase_db_gap','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',s])).stdout.trim();
const cohort=randomUUID(),week=randomUUID(),assignment=randomUUID(),draftWeek=randomUUID(),draftAssignment=randomUUID(),users=[];
const app=process.env.GAP_TEST_APP_URL;
if(app)assert.ok(['localhost','127.0.0.1'].includes(new URL(app).hostname));
async function fixture(role='member',{active=true,domain='ucdavis.edu',approved=true,enrolled=true}={}){
 const email=`gap-written-test-${randomUUID()}@${domain}`,person=randomUUID();
 const user=ok(await admin.auth.admin.createUser({email,email_confirm:true})).user;users.push({id:user.id,person});
 await sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(user.id)},${q(user.id)},jsonb_build_object('sub',${q(user.id)},'email',${q(email)},'email_verified',true),'google',now(),now());
 insert into public.people(id,email,full_name) values(${q(person)},${q(email)},'Written Test');
 ${approved?`insert into public.approved_members(person_id,email,full_name,role,active) values(${q(person)},${q(email)},'Written Test',${q(role)},${active});`:''}
 ${enrolled?`insert into public.cohort_enrollments(person_id,cohort_id) values(${q(person)},${q(cohort)});`:''}`);
 const link=ok(await admin.auth.admin.generateLink({type:'magiclink',email})),client=createClient(config.API_URL,config.ANON_KEY,options);
 ok(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
 if(active&&approved&&domain==='ucdavis.edu')ok(await client.rpc('sync_profile'));
 return{id:user.id,person,client};
}
async function jar(user,expired=false){
 const cookies=new Map(),session=ok(await user.client.auth.getSession()).session;
 const client=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:v=>v.forEach(c=>cookies.set(c.name,c.value))}});
 ok(await client.auth.setSession(session));
 if(expired){
  const [header,body]=session.access_token.split('.');
  const unsigned=`${header}.${Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url')),exp:1})).toString('base64url')}`;
  const access_token=`${unsigned}.${createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url')}`;
  const name=[...cookies.keys()][0].replace(/\.\d+$/,'');
  return new Map([[name,'base64-'+Buffer.from(JSON.stringify({...session,access_token,refresh_token:'invalid-test-refresh',expires_at:1,expires_in:0})).toString('base64url')]]);
 }
 return cookies;
}
async function action(args,cookies=new Map()){
 const manifest=JSON.parse(await readFile(process.env.GAP_TEST_ACTION_MANIFEST||'.next/server/server-reference-manifest.json','utf8'));
 const id=Object.entries(manifest.node).find(([,entry])=>entry.exportedName==='saveText')?.[0];assert.ok(id);
 const response=await fetch(new URL('/week/1',app),{method:'POST',redirect:'manual',headers:{'next-action':id,'content-type':'text/plain;charset=UTF-8',origin:app,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(args)});
 return{body:await response.text(),redirect:response.headers.get('x-action-redirect')??''};
}
const current=async client=>ok(await client.from('submissions').select('*').eq('assignment_id',assignment).eq('is_current',true).single());
const submit=(client,text,base)=>client.rpc('submit_text',{p_assignment_id:assignment,p_text:text,...(base?{p_expected_id:base.id,p_expected_updated_at:base.updated_at}:{})});
const snapshot=()=>sql(`select coalesce(jsonb_agg(s order by id),'[]') from public.submissions s where assignment_id=${q(assignment)}`);
test('written submission authorization, history, races and preview isolation',async t=>{
 try{
  await sql(`insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(${q(cohort)},'spring',2987,'2987-04-01','2987-06-01','active');
   insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values(${q(week)},${q(cohort)},1,'Written week','Disposable test',true),(${q(draftWeek)},${q(cohort)},2,'Hidden week','Private',false);
   insert into public.assignments(id,week_id,title,instructions,due_at) values(${q(assignment)},${q(week)},'SWOT analysis','Describe strengths, weaknesses, opportunities and threats.',now()),(${q(draftAssignment)},${q(draftWeek)},'Hidden','Private',now());`);
  const lead=await fixture('admin',{enrolled:false}),member=await fixture(),other=await fixture(),inactive=await fixture('member',{active:false}),wrong=await fixture('member',{domain:'example.com'}),unapproved=await fixture('member',{approved:false});
  await t.test('payload boundaries and live authorization leave rejected writes unchanged',async()=>{
   const before=await snapshot();
   for(const client of [anon,inactive.client,wrong.client,unapproved.client,lead.client])assert.ok((await submit(client,'forged')).error);
   for(const text of ['', ' \n\t', '\u00a0','x'.repeat(20001)])assert.ok((await submit(member.client,text)).error);
   assert.ok((await member.client.rpc('submit_text',{p_assignment_id:draftAssignment,p_text:'Private'})).error);
   assert.ok((await member.client.from('submissions').insert({assignment_id:assignment,enrollment_id:randomUUID(),submission_type:'text',submitted_text:'forged'})).error);
   assert.equal(await snapshot(),before);
   const results=await Promise.all([submit(member.client,'😀'.repeat(20000)),submit(member.client,'Duplicate first attempt')]);assert.equal(results.filter(r=>!r.error).length,1);
   const first=await current(member.client);assert.equal(first.file_path,null);assert.equal(first.submitted_url,null);
   assert.equal(ok(await other.client.from('submissions').select('id').eq('id',first.id)).length,0);
   assert.ok((await submit(other.client,'cross-user',first)).error);
   assert.ok((await admin.from('submissions').insert({assignment_id:assignment,enrollment_id:first.enrollment_id,submission_type:'text',submitted_text:'mixed',submitted_url:'https://example.com',is_current:false})).error);
  });
  await t.test('text/link/file history and concurrent review/replacement preserve versions',async()=>{
   let base=await current(member.client);
   const results=await Promise.all([submit(member.client,'First replacement',base),submit(member.client,'Second replacement',base)]);
   assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error).error.code,'40001');
   assert.ok((await submit(member.client,'Lost response retry',base)).error);
   base=await current(member.client);
   ok(await member.client.rpc('submit_link',{p_assignment_id:assignment,p_url:'https://example.com/swot',p_expected_id:base.id,p_expected_updated_at:base.updated_at}));
   base=await current(member.client);ok(await submit(member.client,'Text after link',base));base=await current(member.client);
   const data={assignmentId:assignment,name:'swot.pdf',size:pdf.length,mime:'application/pdf',expectedId:base.id,expectedUpdatedAt:base.updated_at};
   const intent=ok(await admin.rpc('file_upload',{p_actor:member.id,p_action:'prepare',p_data:data}));assert.ok(intent.path);
   ok(await member.client.storage.from('submissions').upload(intent.path,pdf,{contentType:'application/pdf'}));
   const receipt=ok(await admin.rpc('file_upload',{p_actor:member.id,p_action:'finalize',p_intent:intent.id,p_data:{size:pdf.length,mime:'application/pdf'}}));assert.equal(receipt.state,'committed');
   base=await current(member.client);assert.equal(base.submission_type,'file');
   ok(await submit(member.client,'Text after file',base));assert.equal(ok(await member.client.storage.from('submissions').download(base.file_path)).size,pdf.length);
   base=await current(member.client);
   const race=await Promise.all([submit(member.client,'Racing replacement',base),lead.client.rpc('review_submission',{p_data:{id:base.id,status:'completed',feedback:'Approved',expectedUpdatedAt:base.updated_at}})]);
   assert.equal(race.filter(r=>!r.error).length,1);base=await current(member.client);
   if(base.status!=='completed')ok(await lead.client.rpc('review_submission',{p_data:{id:base.id,status:'completed',feedback:'Approved',expectedUpdatedAt:base.updated_at}}));
   base=await current(member.client);const before=await snapshot();assert.ok((await submit(member.client,'Cannot replace',base)).error);assert.equal(await snapshot(),before);
   ok(await lead.client.rpc('review_submission',{p_data:{id:base.id,status:'revision_requested',feedback:'Expand your analysis',expectedUpdatedAt:base.updated_at}}));
  });
  await t.test('HTTP actions reject unauthorized and malformed requests',{skip:!app},async()=>{
   const before=await snapshot();
   for(const user of [null,inactive,wrong,unapproved])assert.match((await action([assignment,'forged'],user?await jar(user):new Map())).redirect,user?/\/access-denied/:/\/login/);
   const cookies=await jar(member),base=await current(member.client);
   for(const args of [[{},'text'],[assignment,null],[assignment,' '],[assignment,'x'.repeat(20001)],[assignment,'text',base.id],[randomUUID(),'text'],[assignment,'text',base.id,'2000-01-01T00:00:00Z']])assert.match((await action(args,cookies)).body,/error/);
   assert.match((await action([assignment,'forged',base.id,base.updated_at],await jar(other))).body,/error/);
   assert.match((await action([assignment,'expired'],await jar(other,true))).redirect,/\/login/);
   await sql(`update public.approved_members set active=false where person_id=${q(member.person)}`);
   assert.match((await action([assignment,'deactivated',base.id,base.updated_at],cookies)).redirect,/\/access-denied/);
   assert.ok((await submit(member.client,'deactivated',base)).error);
   await sql(`update public.approved_members set active=true where person_id=${q(member.person)}`);
   assert.equal(await snapshot(),before);
  });
  await t.test('desktop/phone written workflow and non-mutating admin editor preview',{skip:!app},async()=>{
   const {chromium}=await import('playwright-core'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),screens=await mkdtemp(join(tmpdir(),'gap-written-browser-'));
   try{for(const width of [1280,390]){
    const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addCookies([...(await jar(member))].map(([name,value])=>({name,value,url:app})));const page=await ctx.newPage();page.setDefaultTimeout(15000);
    await page.goto(`${app}/week/1/submission?assignment=${assignment}`);await page.getByRole('button',{name:'Revise submission',exact:true}).click();await page.getByRole('button',{name:/^Write response/}).click();
    const text=`Strengths\n\nResearch 😀 <script>window.__writtenUnsafe=true</script>\n${'longword'.repeat(40)}`;
    await page.getByLabel('Your response',{exact:true}).fill(text);
    await page.getByRole('link',{name:/Assignment$/}).click();await page.getByRole('link',{name:'View feedback',exact:true}).click();await page.getByRole('button',{name:'Revise submission',exact:true}).click();assert.equal(await page.getByLabel('Your response',{exact:true}).inputValue(),text);
    await page.getByRole('button',{name:/^Submit link/}).click();await page.getByRole('button',{name:/^Write response/}).click();assert.equal(await page.getByLabel('Your response',{exact:true}).inputValue(),text);
    if(width===1280){
     const stale=await current(member.client);ok(await lead.client.rpc('review_submission',{p_data:{id:stale.id,status:'revision_requested',feedback:'Updated while you were writing',expectedUpdatedAt:stale.updated_at}}));
     await page.getByRole('button',{name:'Revise submission',exact:true}).click();await page.getByRole('alert').filter({hasText:'changed'}).waitFor();assert.equal(await page.getByLabel('Your response',{exact:true}).inputValue(),text);
     page.once('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'Revise submission',exact:true}).click();await page.getByRole('button',{name:/^Write response/}).click();await page.getByLabel('Your response',{exact:true}).fill(text);
    }
    await page.getByRole('button',{name:'Revise submission',exact:true}).click();await page.getByLabel('Written response',{exact:true}).filter({hasText:'Research 😀'}).first().waitFor();await page.reload();assert.equal(await page.evaluate(()=>window.__writtenUnsafe),undefined);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const row=await current(member.client),adminCtx=await browser.newContext({viewport:{width,height:900}});await adminCtx.addCookies([...(await jar(lead))].map(([name,value])=>({name,value,url:app})));const preview=await adminCtx.newPage();preview.setDefaultTimeout(15000);
    await preview.goto(`${app}/admin/submissions/${row.id}?cohort=${cohort}`);await preview.getByLabel('Written response',{exact:true}).filter({hasText:'Research 😀'}).first().waitFor();
    await preview.screenshot({path:join(screens,`admin-review-${width}.png`),fullPage:true});
    await preview.getByLabel('Request revision',{exact:true}).check();await preview.getByLabel('Feedback (required)',{exact:true}).fill('Clear SWOT, add evidence.');await preview.getByRole('button',{name:'Save review',exact:true}).click();await preview.getByText('Review saved.',{exact:true}).waitFor();
    await page.reload();await page.getByText('Clear SWOT, add evidence.',{exact:true}).first().waitFor();
    const before=await snapshot();let writes=0;preview.on('request',r=>{if(r.method()!=='GET')writes++;});
    await preview.goto(`${app}/admin/preview/week/1?cohort=${cohort}`);await preview.getByRole('link',{name:/^View assignment:/}).click();await preview.getByRole('button',{name:'Preview submission',exact:true}).click();
    await preview.getByRole('button',{name:/^Write response/}).click();await preview.getByLabel('Your response',{exact:true}).fill('Preview SWOT');
    await preview.getByRole('button',{name:/^Upload file/}).click();await preview.getByLabel('Choose file',{exact:true}).setInputFiles({name:'preview.pdf',mimeType:'application/pdf',buffer:pdf});
    await preview.getByRole('button',{name:/^Submit link/}).click();await preview.getByLabel('Submission link',{exact:true}).fill('https://example.com/preview');
    assert.ok(await preview.getByRole('button',{name:'Submit assignment',exact:true}).isDisabled());assert.equal(writes,0);assert.equal(await snapshot(),before);
    assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await preview.screenshot({path:join(screens,`preview-${width}.png`),fullPage:true});await page.screenshot({path:join(screens,`member-review-${width}.png`),fullPage:true});await ctx.close();await adminCtx.close();
   }console.log(`Written-response browser screenshots: ${screens}`);}finally{await browser.close();}
  });
 }finally{
  const paths=await sql(`select file_path from public.submissions where assignment_id=${q(assignment)} and file_path is not null union select path from private.upload_intents where assignment_id=${q(assignment)}`);if(paths)ok(await admin.storage.from('submissions').remove(paths.split('\n')));
  await sql(`delete from private.upload_intents where assignment_id in (${q(assignment)},${q(draftAssignment)});delete from public.submissions where assignment_id in (${q(assignment)},${q(draftAssignment)});delete from public.assignments where week_id in (${q(week)},${q(draftWeek)});delete from public.program_weeks where cohort_id=${q(cohort)};delete from public.cohort_enrollments where cohort_id=${q(cohort)};delete from public.program_cohorts where id=${q(cohort)};`);
  for(const user of users){await sql(`delete from public.profiles where id=${q(user.id)};delete from public.approved_members where person_id=${q(user.person)};delete from public.people where id=${q(user.person)}`);ok(await admin.auth.admin.deleteUser(user.id));}
  assert.equal(await sql(`select count(*) from public.program_cohorts where id=${q(cohort)}`),'0');
 }
});
