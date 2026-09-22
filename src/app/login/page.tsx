import { signIn } from './actions';
import { safeReturnPath, supabaseConfig } from '@/lib/supabase/config';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { SignInButton } from './sign-in-button';

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (!supabaseConfig()) redirect('/setup');
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center bg-canvas px-4 py-8 sm:py-12">
      <Card className="my-auto w-full max-w-[420px] p-6 text-center sm:p-8">
        <Image
          src="/brand/180dc-uc-davis-primary-dark.png"
          alt="180 Degrees Consulting at UC Davis"
          width={810}
          height={893}
          sizes="144px"
          className="mx-auto h-auto w-36"
        />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">Welcome to GAP</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Sign in with your approved UC Davis Google account.
        </p>
        <form action={signIn} className="mt-7">
          <input type="hidden" name="next" value={safeReturnPath(params.next)} />
          {params.error ? (
            <p role="alert" className="mb-5 rounded-lg border border-danger-text/20 bg-danger-text/5 p-3 text-left text-sm leading-6 text-danger-text">
              Sign-in could not be completed. Please try again or contact your GAP lead.
            </p>
          ) : null}
          <SignInButton />
        </form>
      </Card>
    </main>
  );
}
