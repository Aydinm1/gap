import test from 'node:test';
import assert from 'node:assert/strict';
import { mondayConfig, normalizeItem, readMonday } from '../src/lib/monday/reader.ts';
const config={token:'fixture',account:'1',board:'2',email:'email',checkbox:'check',cohort:'cohort',status:'status'};
test('Monday normalization validates identities and single cohort while status is informational',()=>{
 const row=normalizeItem({id:'3',name:' Example ',column_values:[{id:'email',text:' MEMBER@UCDAVIS.EDU ',value:null},{id:'check',text:null,value:'{"checked":true}'},{id:'cohort',text:'Fall',value:'{"ids":[1]}'},{id:'status',text:'Alumni',value:null}]},config);
 assert.equal(row.email,'member@ucdavis.edu');assert.equal(row.checked,true);assert.equal(row.issue,'');assert.equal(row.status,'Alumni');
 assert.match(normalizeItem({id:'4',name:'X',column_values:[]},config).issue,/email/);
});
test('Monday config rejects conflicting board aliases',()=>{
 assert.throws(()=>mondayConfig({MONDAY_MEMBERS_BOARD_ID:'1',MONDAY_APPLICANTS_BOARD_ID:'2'}),/Conflicting/);
});
test('Monday paginates completely and refuses partial or wrong-account results',async()=>{
 const board={id:'2',name:'Fixture',columns:[{id:'email',type:'text'},{id:'check',type:'checkbox'},{id:'cohort',type:'dropdown'},{id:'status',type:'status'}],items_page:{items:[],cursor:'next'}};
 let calls=0;
 const transport=async()=>Response.json({data:++calls===1?{account:{id:'1'},boards:[board]}:{next_items_page:{items:[],cursor:null}}});
 assert.deepEqual((await readMonday(config,transport)).rows,[]);assert.equal(calls,2);
 await assert.rejects(readMonday({...config,account:'wrong'},async()=>Response.json({data:{account:{id:'1'},boards:[board]}})),/account/);
 calls=0;
 await assert.rejects(readMonday(config,async()=>++calls===1?Response.json({data:{account:{id:'1'},boards:[board]}}):Response.json({errors:[{message:'private provider details'}]})),/complete the read/);
});
