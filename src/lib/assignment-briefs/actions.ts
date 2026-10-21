'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { storageServer, readBounded } from '@/lib/uploads/server';
import { fileError } from '@/lib/uploads/format';
import { inspectFile } from '@/lib/uploads/inspect';
import type { Database } from '@/lib/supabase/database.types';

type Document = Database['public']['Tables']['assignment_documents']['Row'];
export type BriefResult = { document: Document } | { error: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = 'Assignment PDF storage is unavailable. Please retry or contact your GAP administrator.';
function outcome(data: unknown): BriefResult {
  if (!data || typeof data !== 'object' || !('id' in data)) return { error: 'The assignment PDF changed or this upload expired. Reload before starting again.' };
  return { document: data as Document };
}
export async function prepareBrief(assignmentId: string, file: { name: string; size: number; type: string }, expectedId?: string): Promise<BriefResult> {
  const user = await requireUser(true);
  const invalid = fileError(file);
  if (invalid) return { error: invalid };
  if (!file.name.toLowerCase().endsWith('.pdf')) return { error: 'Choose a PDF assignment brief.' };
  if (typeof assignmentId !== 'string' || !uuid.test(assignmentId) || (expectedId !== undefined && (typeof expectedId !== 'string' || !uuid.test(expectedId)))) return { error: 'Save the assignment before attaching a PDF.' };
  try {
    const db = storageServer();
    const bucket = await db.storage.getBucket('assignment-briefs');
    if (bucket.error || bucket.data.public) return { error: unavailable };
    const result = await db.rpc('assignment_brief', { p_actor: user.id, p_action: 'prepare', p_data: { assignmentId, name: file.name, size: file.size, expectedId } });
    return result.error ? { error: unavailable } : outcome(result.data);
  } catch { return { error: unavailable }; }
}
export async function cancelBrief(id: string): Promise<{ error?: string }> {
  const user = await requireUser(true);
  if (typeof id !== 'string' || !uuid.test(id)) return { error: 'Invalid upload.' };
  try {
    const db = storageServer();
    const result = await db.rpc('assignment_brief', { p_actor: user.id, p_action: 'cancel', p_id: id });
    const value = outcome(result.data);
    if (result.error || 'error' in value) return { error: 'Could not confirm cancellation. Retry cancellation; the upload expires after one hour.' };
    if (value.document.state === 'abandoned') {
      const removed = await db.storage.from('assignment-briefs').remove([value.document.path]);
      if (removed.error) return { error: 'Upload canceled. Storage cleanup needs a retry.' };
    }
    return {};
  } catch { return { error: 'Could not confirm cancellation. Please retry.' }; }
}
export async function finalizeBrief(id: string): Promise<BriefResult> {
  const user = await requireUser(true);
  if (typeof id !== 'string' || !uuid.test(id)) return { error: 'Invalid upload.' };
  try {
    const db = storageServer();
    const result = await db.rpc('assignment_brief', { p_actor: user.id, p_action: 'get', p_id: id });
    const value = outcome(result.data);
    if (result.error || 'error' in value) return { error: 'Upload unavailable or expired. Start a new upload.' };
    let document = value.document;
    if (document.state !== 'ready') {
      if (document.state !== 'pending') return { error: 'Upload canceled or expired. Start a new upload.' };
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/assignment-briefs/${document.path.split('/').map(encodeURIComponent).join('/')}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, apikey: process.env.SUPABASE_SECRET_KEY! }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!response.ok) return { error: 'The uploaded PDF is not available yet. Retry saving.' };
      let bytes: Buffer;
      try {
        bytes = await readBounded(response);
      } catch (error) {
        if (!(error instanceof RangeError)) return { error: 'Transfer inspection was interrupted. Retry saving; your upload is retained.' };
        await cancelBrief(id);
        return { error: 'PDF exceeds the 20 MB limit. Select a smaller PDF.' };
      }
      try {
        await inspectFile(bytes, document.original_filename, response.headers.get('content-type')?.split(';')[0] ?? '', document.file_size);
      } catch {
        await cancelBrief(id);
        return { error: 'The file is not a valid PDF or its size does not match. Cancel and select a valid PDF.' };
      }
      const saved = await db.rpc('assignment_brief', { p_actor: user.id, p_action: 'finalize', p_id: id, p_data: { size: bytes.length } });
      if (saved.error) return { error: 'Could not attach the PDF. Retry saving; your upload is retained.' };
      const receipt = outcome(saved.data);
      if ('error' in receipt) return receipt;
      document = receipt.document;
      if (document.state !== 'ready') return { error: 'Upload expired. Start again.' };
    }
    revalidatePath('/admin', 'layout'); revalidatePath('/', 'layout');
    return { document };
  } catch { return { error: unavailable }; }
}
