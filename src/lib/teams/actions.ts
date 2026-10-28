'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function saveTeam(action: string, data: Record<string,unknown>) {
  await requireUser(true);
  if(!data||typeof data!=='object'||Array.isArray(data)||!['create','rename','members','delete'].includes(action)) return {error:'Invalid team request.'};
  if(action==='create' ? !uuid(data.cohortId)||typeof data.isTest!=='boolean' : !uuid(data.id)||!Number.isSafeInteger(data.version)||(data.version as number)<0) return {error:'Invalid team details. Reload and retry.'};
  if(['create','rename'].includes(action)&&(typeof data.name!=='string'||!data.name.trim()||Array.from(data.name.trim()).length>100)) return {error:'Enter a team name of up to 100 characters.'};
  if(action==='members'&&(!Array.isArray(data.enrollmentIds)||data.enrollmentIds.length>200||!data.enrollmentIds.every(uuid))) return {error:'Choose valid participants.'};
  const db=await createClient();
  const {data:teamId,error}=await db.rpc('manage_team',{p_action:action,p_data:JSON.parse(JSON.stringify(data))});
  if(error?.code==='23505') return {error:action==='create'?'That team name is already in use. Review the updated suggestion and confirm again.':'That team name is already in use. Choose another name.',code:'name_conflict' as const};
  if(error) return {error:error.code==='40001'?'This team changed. Reload before saving. Your selection is kept.':error.code==='22023'?error.message:'Could not save the team. Check the name and participants, then retry.'};
  revalidatePath('/admin','layout');revalidatePath('/','layout');
  return {success:true,id:teamId};
}
