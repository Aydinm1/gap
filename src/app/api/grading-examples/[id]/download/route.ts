import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/grading/types';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Sign in to download.', { status: 401, headers });
  const { id } = await params;
  if (!isUuid(id)) return new Response('File not found.', { status: 404, headers });
  // Both metadata RLS and Storage recheck live admin authority; no service-key download.
  const { data: document, error } = await db.from('grading_example_documents').select('path,original_filename,state').eq('id', id).maybeSingle();
  if (error || !document || document.state !== 'ready') return new Response('File not found or access denied.', { status: 404, headers });
  const { data: { session } } = await db.auth.getSession();
  if (!session) return new Response('Sign in to download.', { status: 401, headers });
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/grading-examples/${document.path.split('/').map(encodeURIComponent).join('/')}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(60000) });
    if (!r.ok || !r.body) return new Response('PDF unavailable. Please retry.', { status: 503, headers });
    const name = encodeURIComponent(document.original_filename.replace(/[\x00-\x1f\x7f]/g, '_')).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`);
    return new Response(r.body, { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="example.pdf"; filename*=UTF-8''${name}` } });
  } catch { return new Response('PDF unavailable. Please retry.', { status: 503, headers }); }
}
