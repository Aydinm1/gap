import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdminPreview } from '../src/lib/program/admin-preview.ts';
import { buildProgramDashboard } from '../src/lib/program/dashboard.ts';

test('admin preview strips locked payloads and ignores real enrollments and submissions',()=>{
  const user={id:'lead',personId:'person',fullName:'Lead',role:'admin'};
  const cohort={id:'c',quarter:'fall',year:2026,state:'active'};
  const state={cohorts:[cohort],weeks:[
    {id:'published',cohortId:'c',weekNumber:1,title:'Published',publicationState:'published',description:'Read me',resources:[]},
    {id:'draft',cohortId:'c',weekNumber:2,title:'Locked',publicationState:'draft',description:'Secret',resources:[{url:'secret-url'}]},
    {id:'other',cohortId:'other',weekNumber:1,title:'Other cohort',publicationState:'published'},
  ],enrollments:[{personId:'other-member'}],submissions:[{feedback:'private feedback'}]};
  const before=JSON.stringify(state);
  const preview=buildAdminPreview(state,user,'c');
  assert.deepEqual(preview.submissions,[]);
  assert.equal(preview.enrollment.id,'admin-preview');
  assert.equal(preview.weeks.length,2);
  assert.deepEqual(Object.keys(preview.weeks[1]).sort(),['id','cohortId','weekNumber','title','publicationState'].sort());
  assert.equal(buildProgramDashboard({...preview,now:new Date()}).completedModules,0);
  assert.equal(JSON.stringify(state),before);
  assert.equal(buildAdminPreview(state,user,'unknown'),null);
  assert.equal(buildAdminPreview({...state,cohorts:[]},user),null);
});
