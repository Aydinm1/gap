'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { guidedInputError, type GuidedAction, type GuidedProject } from './types';
import { isUuid } from '@/lib/grading/types';
import type { Json } from '@/lib/supabase/database.types';

export async function saveGuidedProject(action: GuidedAction, assignmentId: string, data: unknown, requestId: string): Promise<{ error?: string; project?: GuidedProject }> {
 await requireUser(['config','recommendation','decide'].includes(action));
 const invalid=guidedInputError(action,data);
 if (invalid || !isUuid(assignmentId) || !isUuid(requestId)) return {error:invalid??'Invalid project request.'};
 const d=data as Record<string,unknown>;
 if (['recommendation','decide'].includes(action) && !isUuid(d.teamId) || action==='decide' && !isUuid(d.requestId)) return {error:'Invalid team or direction request.'};
 try {
  const db=await createClient();
  const result=await db.rpc('mutate_guided_project',{p_action:action,p_assignment:assignmentId,p_data:data as Json,p_request:requestId});
  if (result.error) return {error:['22023','40001'].includes(result.error.code)?result.error.message:'Could not save. Check your access and direction approval, then retry. Your input is retained.'};
  revalidatePath('/','layout');
  revalidatePath('/admin','layout');
  const loaded=await db.rpc('read_guided_project',{p_assignment:assignmentId});
  return loaded.error?{error:'Save succeeded but refresh failed. Retry to recover the saved receipt.'}:{project:loaded.data as unknown as GuidedProject};
 } catch { return {error:'Save could not be confirmed. Retry with the same input; your work is retained.'}; }
}
