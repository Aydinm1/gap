import assert from 'node:assert/strict';
import test from 'node:test';
import { caseParticipants, caseStatus, filterCaseParticipants } from '../src/lib/cases/progress.ts';
import { buildWeekQueue } from '../src/lib/program/week-queue.ts';

const assignment = { id: 'cases', workflow: 'cases', weekNumber: 2, title: 'Cases', instructions: 'Work', dueAt: '2026-11-01T00:00:00Z' };
const state = {
  cohorts: [], approvedMembers: [], submissions: [],
  people: ['done', 'working', 'empty', 'test'].map(id => ({ id, fullName: id, email: `${id}@ucdavis.edu` })),
  enrollments: ['done', 'working', 'empty', 'test'].map(id => ({ id, personId: id, cohortId: 'cohort', participationStatus: 'enrolled', isTest: id === 'test' })),
  weeks: [{ id: 'week', cohortId: 'cohort', weekNumber: 2, title: 'Week', publicationState: 'published', assignments: [assignment] }],
  caseProgress: [
    { assignmentId: 'cases', enrollmentId: 'done', answered: 8, completedAt: '2026-10-31T00:00:00Z' },
    { assignmentId: 'cases', enrollmentId: 'working', answered: 8 },
    { assignmentId: 'cases', enrollmentId: 'test', answered: 8, completedAt: '2026-10-31T00:00:00Z' },
    { assignmentId: 'other', enrollmentId: 'empty', answered: 8, completedAt: '2026-10-31T00:00:00Z' },
  ],
};

test('case progress counts finished runs, not grading submissions or merely eight saved answers', () => {
  const queue = buildWeekQueue(state, 'cohort', 'week', new Date());
  const rows = caseParticipants(queue.assignments[0].rows, state.caseProgress);
  assert.deepEqual(rows.map(p => [p.enrollmentId, p.status]), [['done', 'complete'], ['working', 'in_progress'], ['empty', 'not_started']]);
  assert.equal(filterCaseParticipants(rows, 'complete', '').length, 1);
  assert.equal(filterCaseParticipants(rows, 'in_progress', '')[0].answered, 8);
  assert.equal(filterCaseParticipants(rows, 'all', ' DONE@UCDAVIS.EDU ')[0].enrollmentId, 'done');
  assert.equal(filterCaseParticipants(rows, 'not_started', 'done').length, 0);
  assert.equal(queue.rows.length, 0); assert.equal(queue.received, 0); assert.equal(queue.awaiting, 0);
  assert.equal(caseParticipants(buildWeekQueue(state, 'cohort', 'week', new Date(), 'test').assignments[0].rows, state.caseProgress)[0].enrollmentId, 'test');
});

test('case filters support legacy Complete links and sensible empty states', () => {
  assert.equal(caseStatus(null, 'complete'), 'complete');
  assert.equal(caseStatus(null, 'awaiting_review'), 'all');
  assert.equal(caseStatus('in_progress', 'complete'), 'in_progress');
  assert.equal(caseStatus('forged'), 'all');
  assert.deepEqual(caseParticipants([], []), []);
});
