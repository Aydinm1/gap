'use server';

import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';
import { mondayConfig, readMonday } from './reader';
import type { ImportBatch } from './types';

function trustedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Monday import needs a server-only Supabase secret key.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function mondayImport(action: 'preview' | 'map' | 'confirm', batchId?: string, mappings: Record<string,string> = {}) {
  const user = await requireUser(true);
  try {
    const config = mondayConfig(process.env);
    const db = trustedClient();
    async function rpc(operation: string, data: unknown = {}, id = batchId) {
      const result = await db.rpc('monday_import', { p_actor: user.id, p_action: operation, p_batch: id || null, p_data: data });
      if (result.error) throw new Error('Import unavailable or expired. Check your access and reload the preview.');
      return result.data as ImportBatch;
    }
    if (action === 'preview') {
      const source = await readMonday(config);
      return { batch: await rpc('stage', { account: config.account, board: config.board, rows: source.rows }) };
    }
    if (!batchId || !/^[0-9a-f-]{36}$/i.test(batchId)) return { error: 'Invalid preview.' };
    const batch = await rpc('get');
    if (batch.account !== config.account || batch.board !== config.board) return { error: 'Configuration changed. Reload preview.' };
    if (action === 'map') {
      if (Object.values(mappings).some(value => value !== '' && !/^[0-9a-f-]{36}$/i.test(value))) return { error: 'Invalid cohort mapping.' };
      return { batch: await rpc('map', mappings) };
    }
    if (action !== 'confirm') return { error: 'Invalid import action.' };
    const source = await readMonday(config); // Complete read before any writes.
    try {
      for (const row of batch.rows) {
        if (!['ready','needs_link'].includes(row.eligibility) || ['enrolled','linked'].includes(row.result?.status || '')) continue;
        const fresh = source.rows.find(item => item.id === row.id);
        // Missing/unchecked/archived items deliberately fail the snapshot comparison.
        await rpc('process', fresh || { id: row.id, checked: false });
      }
    } finally {
      revalidatePath('/admin', 'layout');
      revalidatePath('/', 'layout');
    }
    return { batch: await rpc('get') };
  } catch (error) {
    // Messages below are local sanitized errors; raw SDK/provider errors are not exposed.
    return { error: error instanceof Error && /^(Monday|Import|Configuration)/.test(error.message)
      ? error.message : 'Import failed. Keep this preview and retry, or reload it if expired.' };
  }
}
