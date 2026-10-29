import test from 'node:test';
import assert from 'node:assert/strict';
import {caseInputError} from '../src/lib/cases/types.ts';
import {deriveAssignmentState,countCompletedModules,findCurrentActionableWeek} from '../src/lib/program/state.ts';
import {buildWeekQueue} from '../src/lib/program/week-queue.ts';
test('case runtime validation rejects forged operations, versions, skipped cases and empty answers',()=>{
 assert.ok(caseInputError('unknown',{}));assert.ok(caseInputError('save',{version:-1}));
 const data={version:0,caseNumber:1,method:'mathematical',framework:'Revenue − costs',priority:'Compare costs'};
 assert.equal(caseInputError('save',data),undefined);
 for(const patch of [{caseNumber:9},{method:'correct'},{framework:'  '},{priority:'x'.repeat(10001)},{version:0.5}])assert.ok(caseInputError('save',{...data,...patch}));
 assert.ok(caseInputError('configure',{version:0,content:{overview:'Overview',closing:'Closing',cases:[]}}));
});
test('case completion drives progress without fabricating submissions or review obligations',()=>{
 const a={id:'exercise',title:'Cases',instructions:'Work',weekNumber:1,workflow:'cases',dueAt:'2026-12-01T00:00:00Z',caseProgress:{answered:8,completedAt:'2026-10-28T00:00:00Z'}};
 const week={id:'week',cohortId:'cohort',weekNumber:1,title:'Workshop',publicationState:'published',assignments:[a]};
 assert.equal(deriveAssignmentState(a,undefined,new Date()),'completed');assert.equal(countCompletedModules([],[week]),1);assert.equal(findCurrentActionableWeek([week],new Map()),undefined);
 const state={people:[{id:'person',fullName:'Fixture'}],enrollments:[{id:'enrollment',cohortId:'cohort',personId:'person',participationStatus:'enrolled'}],weeks:[week],submissions:[],cohorts:[],approvedMembers:[],caseProgress:[{assignmentId:a.id,enrollmentId:'enrollment',answered:8,completedAt:a.caseProgress.completedAt}]};
 const queue=buildWeekQueue(state,'cohort','week',new Date());assert.equal(queue.complete,1);assert.equal(queue.rows.length,0);assert.equal(queue.received,0);assert.equal(queue.awaiting,0);assert.equal(queue.assignments[0].approved,1);
 assert.equal(buildWeekQueue({...state,caseProgress:[]},'cohort','week',new Date()).complete,0);
});
