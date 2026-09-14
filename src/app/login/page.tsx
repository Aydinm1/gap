import { signIn } from './actions';
import { safeReturnPath, supabaseConfig } from '@/lib/supabase/config';
import { redirect } from 'next/navigation';

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (!supabaseConfig()) redirect('/setup');
  const params = await searchParams;
  return <main className="mx-auto max-w-lg px-6 py-24"><p className="text-sm font-bold uppercase tracking-widest text-brand-deep">Growth Analyst Program</p><h1 className="mt-4 text-3xl font-bold">Welcome to GAP</h1><p className="mt-4 leading-7 text-ink-soft">Sign in with your approved UC Davis Google account.</p>
    {params.error ? <p role="alert" className="mt-4 text-danger-text">Sign-in could not be completed. Please try again or contact your GAP lead.</p> : null}
    <form action={signIn} className="mt-8"><input type="hidden" name="next" value={safeReturnPath(params.next)} /><button className="min-h-11 rounded-lg bg-action px-6 py-3 font-bold text-white">Continue with Google</button></form></main>;
}
