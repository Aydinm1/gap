import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";
import { readWorkspace } from '@/lib/supabase/data';
import { readGuidedProject } from '@/lib/guided/data';
import { assignmentsForWeek } from '@/lib/program/types';
import type { ProjectInboxEntry } from '@/components/admin/project-direction-requests';

export const metadata: Metadata = { title: "Admin | GAP" };

export default async function AdminPage() {
  const {state}=await readWorkspace(true);
  const entries:ProjectInboxEntry[]=await Promise.all(state.weeks.flatMap(w=>assignmentsForWeek(w).filter(a=>a.workflow==='guided').map(async a=>({assignmentId:a.id,weekId:w.id,cohortId:w.cohortId,title:a.title,project:await readGuidedProject(a.id)}))));
  return <AdminOverview projectEntries={entries}/>;
}
