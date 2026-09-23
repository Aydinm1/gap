import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { MAX_FILE_BYTES } from './format';

export function storageServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Private uploads need local Storage and a server-only Supabase key. Link submission is still available.');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function readBounded(response: Response) {
  if (!response.ok || !response.body) throw new Error('Storage unavailable.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > MAX_FILE_BYTES) throw new RangeError('File exceeds limit.');
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
export function storageObjectUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/submissions/${path.split('/').map(encodeURIComponent).join('/')}`;
}
