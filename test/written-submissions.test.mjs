import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSubmissionText, replaceSubmission, submissionDisplayName } from '../src/lib/program/submission.ts';

test('written responses preserve paragraphs and validate Unicode length and blank input', () => {
  for (const value of [undefined, null, {}, '', ' \t\r\n', '\u00a0', 'hello\0world', 'a'.repeat(20001)]) assert.ok(normalizeSubmissionText(value).error);
  assert.equal(normalizeSubmissionText('Strengths\r\n\r\n<em>Research</em> 😀').value, 'Strengths\n\n<em>Research</em> 😀');
  assert.equal(normalizeSubmissionText('😀'.repeat(20000)).value.length, 40000);
  assert.ok(normalizeSubmissionText('😀'.repeat(20001)).error);
});

test('written replacement retains independent assignments and original payloads', () => {
  const original = {id:'old',assignmentId:'a',enrollmentId:'e',isCurrent:true,status:'submitted',submittedAt:'2026-01-01',payload:{type:'file',filePath:'private/path',originalFilename:'SWOT.pdf'}};
  const sibling = {...original,id:'sibling',assignmentId:'b'};
  const attempts=replaceSubmission({attempts:[original,sibling],assignmentId:'a',enrollmentId:'e',id:'new',submittedAt:'2026-01-02',payload:{type:'text',submittedText:'Strengths\nResearch'}});
  assert.equal(submissionDisplayName(attempts[0]),'Written response');
  assert.equal(attempts[1].isCurrent,false);
  assert.deepEqual(attempts[1].payload,original.payload);
  assert.equal(attempts[2],sibling);
});
