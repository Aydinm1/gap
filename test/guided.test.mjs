import test from 'node:test';
import assert from 'node:assert/strict';
import {canSubmitGuided,guidedInputError} from '../src/lib/guided/types.ts';
import {guidedOverview,directionIntro,finalBrief} from '../src/lib/guided/content.ts';
test('guided eligibility requires saved research, recommendation and selected/approved direction',()=>{
 const p={workflow:'guided',config:null,state:{direction:'recommended'},recommendation:{},requests:[]};
 assert.equal(canSubmitGuided(p),true);assert.equal(canSubmitGuided({...p,recommendation:null}),false);
 assert.equal(canSubmitGuided({...p,state:{direction:'alternative'},requests:[{status:'pending'}]}),false);
 assert.equal(canSubmitGuided({...p,state:{direction:'alternative'},requests:[{status:'approved'}]}),true);
 assert.equal(canSubmitGuided({...p,state:null}),false);
});
test('guided runtime payload limits, required fields and change-request notes',()=>{
 assert.ok(guidedInputError('forge',{}));assert.ok(guidedInputError('research',{version:-1}));
 assert.ok(guidedInputError('research',{version:0,research:{risk1:'x',risk2:'',question:'x'}}));
 assert.equal(guidedInputError('research',{version:0,research:{risk1:'a',risk2:'b',question:'q'}}),undefined);
 assert.ok(guidedInputError('decide',{version:1,decision:'changes_requested',note:''}));
 assert.equal(guidedInputError('decide',{version:1,decision:'approved',note:''}),undefined);
 for(const text of [guidedOverview,directionIntro,finalBrief])assert.ok(text.length>100&&text.length<50000);
 assert.match(finalBrief,/3–4 primary buckets/);assert.match(finalBrief,/two hypotheses/i);assert.match(finalBrief,/Week 3/);
});
