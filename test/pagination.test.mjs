import assert from 'node:assert/strict';
import test from 'node:test';
import { readPages } from '../src/lib/supabase/pagination.ts';

test('workspace reads retain history beyond the default API row limit', async () => {
  const rows = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const ranges = [];
  const result = await readPages(async (from, to) => {
    ranges.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result.data, rows);
  assert.equal(ranges.length, 13);
});

test('workspace reads fail instead of returning partial history after a page error', async () => {
  await assert.rejects(readPages(async from => from === 0
    ? { data: Array(100).fill({ id: 1 }), error: null }
    : { data: null, error: { message: 'private backend detail' } }), /GAP data could not be loaded/);
  assert.deepEqual(await readPages(async () => ({ data: [], error: null })), { data: [] });
});
