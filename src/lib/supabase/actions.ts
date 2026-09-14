'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from './server';
import { requireUser } from './auth';
import { normalizeSubmissionUrl } from '@/lib/program/submission';

export async function saveAdmin(action: string, data: Record<string, unknown>) {
  await requireUser(true);
  if (!['review','week','enrollment','enroll','roster','cohort_create','cohort_state'].includes(action)) return { error:'Unknown operation.' };
  const db = await createClient();
  const { data:id,error } = await db.rpc('admin_mutate',{ p_action:action,p_data:JSON.parse(JSON.stringify(data)) });
  if (error) return { error:error.code==='40001' ? 'This record changed. Refresh before saving again.' : 'Could not save. Check the entered values and try again. Existing submissions and inactive access are protected.' };
  const reviewed = action === 'review' ? await db.from('submissions').select('updated_at').eq('id',id).single() : null;
  revalidatePath('/admin','layout');
  revalidatePath('/','layout');
  return { id:id as string, updatedAt:reviewed?.data?.updated_at };
}

export async function saveLink(assignmentId: string, url: string, expectedId?: string, expectedUpdatedAt?: string) {
  await requireUser();
  const normalized = normalizeSubmissionUrl(url);
  if ('error' in normalized) return { error:normalized.error };
  const db = await createClient();
  const { error } = await db.rpc('submit_link',{ p_assignment_id:assignmentId,p_url:normalized.value,p_expected_id:expectedId,p_expected_updated_at:expectedUpdatedAt });
  if (error) return { error:error.code==='40001' ? 'Your submission changed. Refresh before submitting again.' : 'Could not submit. The assignment may be closed or unavailable. Your draft has been kept.' };
  revalidatePath('/','layout');
  revalidatePath('/admin','layout');
  return { success:true };
}
