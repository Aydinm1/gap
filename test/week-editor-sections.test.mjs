import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source = name => readFileSync(new URL(`../src/components/admin/${name}.tsx`, import.meta.url), 'utf8');

test('week editor hides inactive panels without unmounting drafts and uploads', () => {
  const editor = source('admin-week-editor');
  for (const section of ['overview', 'assignments', 'materials']) assert.ok(editor.includes(`hidden={section !== '${section}'}`));
  for (const section of ['details', 'instructions', 'activity', 'grading']) assert.ok(editor.includes(`hidden={assignmentSection !== '${section}'}`));
  assert.match(editor, /data-assignment-editor=\{assignment.id\}/);
  assert.match(editor, /#\(grading\|guided\)/);
  assert.match(editor, /Unsaved activity, reference or PDF/);
  assert.match(source('assignment-brief-upload'), /onDirty\?\.\('brief-' \+ assignment.id, Boolean\(file\) \|\| busy\)/);
});

test('activity editors retain all content while showing only the selected section', () => {
  const guided = source('guided-editor'), cases = source('case-editor');
  assert.match(guided, /hidden=\{section!=='teams'\|\|workflow!=='guided'\}/);
  assert.match(guided, /Discard unsaved team direction/);
  assert.match(cases, /hidden=\{section!==String\(c.number\)\}/);
  assert.match(cases, /Select case/);
  const nav = source('editor-sections');
  assert.match(nav, /<nav aria-label=\{label\}/);
  assert.match(nav, /type="button" aria-pressed=/);
  assert.match(nav, /min-h-11/);
});
