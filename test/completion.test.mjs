import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeekQueue } from '../src/lib/program/week-queue.ts';
import { getAdminQueueCounts, filterSubmissionRows } from '../src/lib/program/admin.ts';
import { buildProgramDashboard } from '../src/lib/program/dashboard.ts';
import { buildWeekDetail } from '../src/lib/program/week-detail.ts';

test('manual credit completes only the selected assignment without fabricating received work', () => {
  const credit = {id:'credit',assignmentId:'one',enrollmentId:'e',grantedBy:'lead',grantedAt:'2026-10-28T00:00:00Z'};
  const user = {id:'auth',personId:'p',fullName:'Participant',email:'p@ucdavis.edu',role:'member'};
  const enrollment = {id:'e',personId:'p',cohortId:'c',participationStatus:'enrolled',advancementStatus:'pending'};
  const cohort = {id:'c',quarter:'fall',year:2026,state:'active'};
  const one = {id:'one',weekNumber:1,title:'Legacy work',instructions:'Work',dueAt:'2026-10-01T00:00:00Z',submissionMode:'individual'};
  const week = {id:'w',cohortId:'c',weekNumber:1,title:'Week',publicationState:'published',description:'Work',resources:[],assignments:[one,{...one,id:'two'}]};
  const state = {people:[{id:'p',fullName:user.fullName}],approvedMembers:[],cohorts:[cohort],enrollments:[enrollment],weeks:[week],submissions:[],completionCredits:[credit]};
  const queue = buildWeekQueue(state,'c','w',new Date());
  assert.equal(queue.rows.find(row=>row.assignment.id==='one').state,'completed');
  assert.equal(queue.received,0);assert.equal(queue.awaiting,0);assert.equal(queue.complete,0);
  assert.equal(getAdminQueueCounts(queue.rows).missing,1);assert.equal(filterSubmissionRows(queue.rows,'complete').length,1);
  assert.equal(filterSubmissionRows(queue.rows,'missing')[0].assignment.id,'two');
  const memberWeek = {...week,assignments:[{...one,completionCredit:credit}]};
  const dashboard = buildProgramDashboard({user,cohort,enrollment,weeks:[memberWeek],submissions:[],now:new Date()});
  assert.equal(dashboard.completedModules,1);assert.equal(dashboard.modules[0].completedAssignments,1);assert.equal(dashboard.continueLearning,undefined);assert.equal(dashboard.priorityAssignment,undefined);
  const detail = buildWeekDetail({weeks:[memberWeek],weekNumber:'1',cohortId:'c',enrollmentId:'e',submissions:[],now:new Date()});
  assert.equal(detail.assignment.state,'completed');assert.deepEqual(detail.assignment.attempts,[]);
  assert.equal(buildWeekQueue({...state,completionCredits:[]},'c','w',new Date()).rows.find(row=>row.assignment.id==='one').state,'overdue');
  assert.equal(buildWeekQueue({...state,completionCredits:[{...credit,enrollmentId:'other'}]},'c','w',new Date()).rows.find(row=>row.assignment.id==='one').state,'overdue');
});
