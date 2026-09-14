import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseConfig } from './config';
import type { Database } from './database.types';

export async function createClient() {
  const config = supabaseConfig();
  if (!config) redirect('/setup');
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Read-only Server Components rely on the session-refresh proxy. */ }
      },
    },
  });
}
