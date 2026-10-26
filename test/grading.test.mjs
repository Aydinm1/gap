import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { emptyReference, referenceError } from '../src/lib/grading/types.ts';
import { cleanupGradingExamples } from '../scripts/lib/cleanup-grading-examples.mjs';

const id = '11111111-1111-4111-8111-111111111111';
test('grading references validate runtime payloads and Unicode limits', () => {
  const r = emptyReference(id);
  assert.equal(referenceError(r), undefined);
  assert.equal(referenceError({ ...r, rubric: '😀'.repeat(50000) }), undefined);
  for (const input of [null, [], { ...r, assignmentId: 'fake' }, { ...r, rubric: 1 }, { ...r, example: null }, { ...r, textVersion: -1 }, { ...r, textVersion: '0' }, { ...r, rubric: 'a'.repeat(50001) }]) assert.ok(referenceError(input));
});
test('private grading is not added to shared assignment or preview contracts', () => {
  for (const name of ['src/lib/program/types.ts', 'src/lib/supabase/member-rows.ts', 'src/lib/program/admin-preview.ts', 'src/lib/supabase/explore.ts']) {
    assert.doesNotMatch(readFileSync(new URL('../' + name, import.meta.url), 'utf8'), /assignment_grading_references|grading_example_documents|GradingReference/);
  }
});
test('example cleanup retries failures through its service receipt without targeting ready files', async () => {
  let claim = 0; const calls = [];
  const db = {
    rpc: async (name, args) => { calls.push([name, args]); return { data: args.p_id ? [] : claim++ === 0 ? [{ id, path: 'fixture-only.pdf' }] : [], error: null }; },
    storage: { from: bucket => ({ remove: async paths => { calls.push([bucket, paths]); return { error: new Error('unavailable') }; } }) },
  };
  assert.deepEqual(await cleanupGradingExamples(db, id), { removed: 0, failed: 1 });
  assert.equal(calls[2][1].p_failed, true);
  assert.equal(calls[2][1].p_owner, id);
});
