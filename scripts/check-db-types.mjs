import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';

const { stdout } = await promisify(execFile)('./node_modules/.bin/supabase', [
  'gen', 'types', 'typescript', '--local', '--schema', 'public,private',
], { maxBuffer: 4 * 1024 * 1024 });
assert.equal((await readFile(new URL('../src/lib/supabase/database.types.ts', import.meta.url), 'utf8')).trim(), stdout.trim(),
  'Database types differ from local migrations; regenerate and review the changes.');
console.log('Database types match the local Supabase schema.');
