import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import type { GuidedProject } from './types';

export async function readGuidedProject(assignmentId: string, teamId?: string): Promise<GuidedProject> {
 await requireUser(Boolean(teamId));
 const db = await createClient();
 const result = await db.rpc('read_guided_project', { p_assignment: assignmentId, p_team: teamId });
 if (result.error) throw new Error('Could not load project guidance. Please reload and retry.');
 return result.data as unknown as GuidedProject;
}
