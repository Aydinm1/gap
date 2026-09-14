'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeReturnPath } from '@/lib/supabase/config';

export async function signIn(form: FormData) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) redirect('/setup');
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', safeReturnPath(String(form.get('next') ?? '/')));
  const db = await createClient();
  const { data, error } = await db.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo: callback.toString(), queryParams: { hd: 'ucdavis.edu' },
  } });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}
export async function signOut() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) throw new Error('Sign-out failed. Please try again.');
  redirect('/login');
}
