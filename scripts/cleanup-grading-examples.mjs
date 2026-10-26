import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { cleanupGradingExamples } from './lib/cleanup-grading-examples.mjs';

const config = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
if (new URL(config.API_URL).hostname !== '127.0.0.1') throw new Error('Cleanup is local-only.');
const args = process.argv.slice(2), owner = args[0] === '--owner' ? args[1] : undefined;
if (args.length && (args.length !== 2 || !owner || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(owner))) throw new Error('Usage: cleanup-grading-examples.mjs [--owner UUID]');
const db = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { removed, failed } = await cleanupGradingExamples(db, owner);
console.log(`Example cleanup: ${removed} abandoned paths checked; ${failed} failures retained for retry. Committed PDFs were not targeted.`);
if (failed) process.exitCode = 1;
