import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('callback logs only exchange code/status and preserves failure redirect', async () => {
  const source = readFileSync(new URL('../src/app/auth/callback/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const logs = [];
  const exports = {};
  let rosterCalled = false;
  const modules = {
    'next/server': { NextResponse: { redirect: url => url.toString() } },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { exchangeCodeForSession: async () => ({ error: {
        code: 'bad_code_verifier', status: 400, message: 'private provider detail',
        token: 'private token',
      } }) },
      rpc: async () => { rosterCalled = true; },
    }) },
    '@/lib/supabase/config': { safeReturnPath: () => '/' },
  };
  vm.runInNewContext(compiled, {
    exports, require: name => modules[name], URL,
    process: { env: { NEXT_PUBLIC_SITE_URL: 'https://gap.example' } },
    console: { error: (...args) => logs.push(args) },
  });
  const url = 'https://gap.example/auth/callback?code=private-oauth-code';
  assert.equal(await exports.GET({ url, nextUrl: new URL(url) }), 'https://gap.example/login?error=oauth');
  assert.equal(rosterCalled, false);
  assert.deepEqual(JSON.parse(JSON.stringify(logs)), [
    ['[auth.callback] Session exchange failed', { code: 'bad_code_verifier', status: 400 }],
  ]);
});
