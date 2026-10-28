'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from './auth';
import { createClient } from './server';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function setAssignmentCompletion(action: string, assignmentId: string, enrollmentId: string, creditId?: string) {
  await requireUser(true);
  if (!['grant','revoke'].includes(action) || !uuid(assignmentId) || !uuid(enrollmentId) || (action === 'revoke' && !uuid(creditId))) return {error:'Invalid completion request.'};
  const db = await createClient();
  const {data,error} = await db.rpc('set_assignment_completion', {p_action:action,p_assignment:assignmentId,p_enrollment:enrollmentId,p_credit:creditId});
  if (error) return {error:error.code === '22023' || error.code === '40001' ? error.message : 'Could not update completion. Check your access and retry.'};
  revalidatePath('/admin','layout');
  revalidatePath('/','layout');
  return {id:data};
}
