import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import type { CaseExercise } from './types';
export async function readCaseExercise(assignmentId: string, preview=false): Promise<CaseExercise> {
 await requireUser();
 const db=await createClient();
 const result=await db.rpc('read_case_exercise',{p_assignment:assignmentId,p_preview:preview});
 if(result.error) throw new Error('Could not load the exercise. Please reload and retry.');
 return result.data as unknown as CaseExercise;
}
