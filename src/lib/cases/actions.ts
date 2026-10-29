'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/grading/types';
import type { Json } from '@/lib/supabase/database.types';
import { caseInputError, type CaseAction, type CaseExercise } from './types';
export async function saveCaseExercise(action: CaseAction, assignmentId: string, data: unknown, requestId: string): Promise<{ error?: string; exercise?: CaseExercise }> {
 await requireUser(action==='configure');
 const invalid=caseInputError(action,data);
 if(invalid || !isUuid(assignmentId) || !isUuid(requestId)) return {error:invalid??'Invalid exercise request.'};
 try {
  const db=await createClient();
  const result=await db.rpc('mutate_case_exercise',{p_action:action,p_assignment:assignmentId,p_data:data as Json,p_request:requestId});
  if(result.error) return {error:['22023','40001'].includes(result.error.code)?result.error.message:'Could not save. Check your access and retry. Your input is retained.'};
  revalidatePath('/','layout'); revalidatePath('/admin','layout');
  const loaded=await db.rpc('read_case_exercise',{p_assignment:assignmentId,p_preview:action==='configure'});
  return loaded.error?{error:'Save succeeded but refresh failed. Retry with the same input to recover your saved response.'}:{exercise:loaded.data as unknown as CaseExercise};
 } catch { return {error:'Save could not be confirmed. Retry with the same input; your work is retained.'}; }
}
