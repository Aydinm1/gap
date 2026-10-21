'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from './server';
import { requireUser } from './auth';
import { normalizeSubmissionUrl } from '@/lib/program/submission';

export async function saveAdmin(action: string, data: Record<string, unknown>) {
  await requireUser(true);
  if (!['review','week','enrollment','enroll','roster','cohort_create','cohort_state'].includes(action)) return { error:'Unknown operation.' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error:'Invalid form data. Check the entered values and try again.' };
  const db = await createClient();
  let payload;
  try { payload = JSON.parse(JSON.stringify(data)); }
  catch { return { error:'Invalid form data. Check the entered values and try again.' }; }
  const result = action === 'review'
    ? await db.rpc('review_submission', { p_data: payload }).single()
    : await db.rpc('admin_mutate', { p_action: action, p_data: payload });
  const { error } = result;
  if (error) return { error:error.code==='40001' ? 'This record changed. Refresh before saving again.' : 'Could not save. Check the entered values and try again. Existing submissions and inactive access are protected.' };
  const receipt = typeof result.data === 'object' && result.data !== null ? result.data : null;
  revalidatePath('/admin','layout');
  revalidatePath('/','layout');
  return { id:receipt?.id ?? result.data as string, updatedAt:receipt?.updated_at };
}

export async function saveLink(assignmentId: string, url: string, expectedId?: string, expectedUpdatedAt?: string) {
  await requireUser();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof assignmentId !== 'string' || !uuid.test(assignmentId) || typeof url !== 'string' ||
    (expectedId !== undefined && (typeof expectedId !== 'string' || !uuid.test(expectedId))) ||
    (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(expectedUpdatedAt)))) ||
    ((expectedId === undefined) !== (expectedUpdatedAt === undefined))) {
    return { error:'Invalid submission details. Refresh and try again. Your draft has been kept.' };
  }
  const normalized = normalizeSubmissionUrl(url);
  if ('error' in normalized) return { error:normalized.error };
  const db = await createClient();
  const { error } = await db.rpc('submit_link',{ p_assignment_id:assignmentId,p_url:normalized.value,p_expected_id:expectedId,p_expected_updated_at:expectedUpdatedAt });
  if (error) return { error:error.code==='40001' ? 'Your submission changed. Refresh before submitting again.' : 'Could not submit. The assignment may be closed or unavailable. Your draft has been kept.' };
  revalidatePath('/','layout');
  revalidatePath('/admin','layout');
  return { success:true };
}
