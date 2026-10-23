'use server';
import { requireUser } from './auth';
import { createClient } from './server';

export async function recordActivity() {
  await requireUser();
  const db = await createClient();
  const { error } = await db.rpc('record_activity');
  return { ok: !error };
}
