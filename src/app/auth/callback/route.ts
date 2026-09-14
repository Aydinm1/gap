import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeReturnPath } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return NextResponse.redirect(new URL('/setup', request.url));
  const code = request.nextUrl.searchParams.get('code');
  const db = await createClient();
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const { error: accessError } = await db.rpc('sync_profile');
      if (!accessError) return NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get('next')), origin));
      return NextResponse.redirect(new URL('/access-denied', origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=oauth', origin));
}
