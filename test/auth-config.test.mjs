import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnPath } from '../src/lib/supabase/config.ts';
test('OAuth destinations remain on the local application origin', () => {
  for (const value of ['https://evil.test','//evil.test','/\\evil.test','/\n/evil.test',null]) assert.equal(safeReturnPath(value),'/');
  assert.equal(safeReturnPath('/week/2?view=review'),'/week/2?view=review');
});
