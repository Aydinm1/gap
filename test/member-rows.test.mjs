import assert from 'node:assert/strict';
import test from 'node:test';
import { readMemberRows } from '../src/lib/supabase/member-rows.ts';

function database(tables, failTable) {
  const calls=[];
  return { calls, from(table) {
    const filters=[];
    const query={
      select(){return query;},order(){return query;},
      eq(key,value){filters.push([key,[value]]);return query;},
      in(key,values){filters.push([key,values]);return query;},
      async range(from,to){return result(from,to);},
      async maybeSingle(){const value=result();return {...value,data:value.data?.[0]??null};},
    };
    function result(from=0,to=Infinity) {
      calls.push({table,filters,from,to});
      return {error:table===failTable?new Error('Unavailable'):null,data:(tables[table]??[]).filter(row=>filters.every(([key,values])=>values.includes(row[key]))).slice(from,to+1)};
    }
    return query;
  },async rpc(name,args){calls.push({name,args});return {data:name==='my_team'?tables.my_team??null:[],error:null};}};
}

test('member loader scopes database queries even when the client has admin visibility',async()=>{
  const db=database({
    cohort_enrollments:[{id:'own',person_id:'me',cohort_id:'current',participation_status:'enrolled'},{id:'old',person_id:'me',cohort_id:'old',participation_status:'enrolled'},{id:'foreign',person_id:'other',cohort_id:'foreign',participation_status:'enrolled'}],
    program_cohorts:[{id:'current',quarter:'fall',year:2026,state:'active'},{id:'old',quarter:'spring',year:2026,state:'active'},{id:'foreign',quarter:'fall',year:2027,state:'active'}],
    program_weeks:[{id:'published',cohort_id:'current',published:true},{id:'draft',cohort_id:'current',published:false},{id:'foreign',cohort_id:'foreign',published:true}],
    resources:[{id:'own',week_id:'published'},{id:'hidden',week_id:'draft'}],
    assignments:[{id:'own',week_id:'published'},{id:'hidden',week_id:'draft'}],
    submissions:[...Array.from({length:1001},(_,id)=>({id,enrollment_id:'own'})),{id:'foreign',enrollment_id:'foreign'}],
  });
  const rows=await readMemberRows(db,'me');
  assert.equal(rows.cohort.id,'current');
  assert.equal(rows.submissions.length,1001);
  assert.deepEqual(rows.weeks.map(w=>w.id),['published']);
  assert.deepEqual(rows.resources.map(w=>w.id),['own']);
  assert.deepEqual(rows.assignments.map(w=>w.id),['own']);
  assert.ok(db.calls.filter(c=>c.table).every(c=>c.filters.length>0));
  assert.ok(!db.calls.some(c=>['people','approved_members','profiles'].includes(c.table)));
});

test('empty participation makes no program-wide queries and query failures do not look empty',async()=>{
  const db=database({});
  assert.equal((await readMemberRows(db,'me')).cohort,undefined);
  assert.deepEqual(db.calls.map(c=>c.table),['cohort_enrollments']);
  await assert.rejects(readMemberRows(database({},'cohort_enrollments'),'me'),/could not be loaded/);
});
test('teammate history is explicitly scoped to the caller team, never another team or an individual teammate',async()=>{
 const db=database({my_team:{id:'my-team',name:'My team',members:[]},cohort_enrollments:[{id:'own',person_id:'me',cohort_id:'cohort',participation_status:'enrolled'}],program_cohorts:[{id:'cohort',quarter:'fall',year:2026,state:'active'}],submissions:[{id:'own',enrollment_id:'own'},{id:'shared',team_id:'my-team'},{id:'other',team_id:'other-team'},{id:'teammate-private',enrollment_id:'teammate'}]});
 const rows=await readMemberRows(db,'me');assert.deepEqual(rows.submissions.map(s=>s.id),['own','shared']);assert.equal(rows.team.id,'my-team');
 assert.ok(db.calls.some(c=>c.name==='my_team'&&c.args.p_enrollment==='own'));
});
