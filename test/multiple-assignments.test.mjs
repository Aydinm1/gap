import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProgramDashboard } from '../src/lib/program/dashboard.ts';
import { buildWeekDetail } from '../src/lib/program/week-detail.ts';
import { mockCohorts, mockEnrollments, mockUsers, mockWeeks, MOCK_NOW } from '../src/lib/program/mock-data.ts';

const enrollment = mockEnrollments[0];
const source = mockWeeks.find((week) => week.weekNumber === 1);
const assignments = [source.assignment, { ...source.assignment, id: 'second-assignment', title: 'Second assignment' }];
const week = { ...source, assignment: undefined, assignments };
const attempt = (assignmentId, status, extra = {}) => ({ id: `${assignmentId}-${status}`, assignmentId, enrollmentId: enrollment.id, status, submittedAt: MOCK_NOW.toISOString(), isCurrent: true, payload: { type: 'link', submittedUrl: 'https://example.com' }, ...extra });
const dashboard = (submissions) => buildProgramDashboard({ user: mockUsers.member, cohort: mockCohorts.fall2026, enrollment, weeks: [week], submissions, now: MOCK_NOW });

test('a module completes only when every assignment has a current approved attempt', () => {
  const approved = attempt(assignments[0].id, 'completed');
  for (const status of ['submitted', 'revision_requested']) {
    const result = dashboard([approved, attempt(assignments[1].id, status)]);
    assert.equal(result.completedModules, 0);
    assert.equal(result.modules[0].completedAssignments, 1);
    assert.equal(result.modules[0].totalAssignments, 2);
    assert.equal(result.currentWeekNumber, 1);
  }
  assert.equal(dashboard([approved]).completedModules, 0);
  assert.equal(dashboard([approved, attempt(assignments[1].id, 'completed', { isCurrent: false })]).completedModules, 0);
  assert.equal(dashboard([approved, attempt(assignments[1].id, 'completed', { enrollmentId: 'other' })]).completedModules, 0);
  const completed = dashboard([approved, attempt(assignments[1].id, 'completed')]);
  assert.equal(completed.completedModules, 1);
  assert.equal(completed.continueLearning, undefined);
});

test('week details isolate each assignment history and retain independent PDFs', () => {
  const submissions = [attempt(assignments[0].id, 'completed'), attempt(assignments[1].id, 'revision_requested'), attempt(assignments[1].id, 'submitted', { id: 'old', isCurrent: false }), attempt(assignments[1].id, 'submitted', { enrollmentId: 'other' })];
  const detail = buildWeekDetail({ weeks: [week], weekNumber: '1', cohortId: enrollment.cohortId, enrollmentId: enrollment.id, submissions, now: MOCK_NOW });
  assert.equal(detail.assignments.length, 2);
  assert.equal(detail.assignments[0].state, 'completed');
  assert.deepEqual(detail.assignments[0].attempts.map((item) => item.assignmentId), [assignments[0].id]);
  assert.equal(detail.assignments[1].state, 'revision_requested');
  assert.equal(detail.assignments[1].attempts.length, 2);
  assert.match(dashboard(submissions).priorityAssignment.actionHref, /assignment=second-assignment/);
});
