import type { Metadata } from "next";
import { AdminWeekEditor } from "@/components/admin/admin-week-editor";
import { readWorkspace } from '@/lib/supabase/data';
import { readGradingReferences } from '@/lib/grading/data';
import { assignmentsForWeek } from '@/lib/program/types';
export const metadata: Metadata = { title: "Edit week | GAP Admin" };
export default async function AdminWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await readWorkspace(true);
  const week = state.weeks.find(w => w.id === id);
  const references = await readGradingReferences(week ? assignmentsForWeek(week).map(a => a.id) : []);
  return <AdminWeekEditor key={id} weekId={id} references={references} />;
}
