import { AdminAttendance } from '@/components/attendance/admin-attendance';
import { readAttendanceAdmin } from '@/lib/attendance/data';
import { readWorkspace } from '@/lib/supabase/data';
export const metadata = { title: 'Attendance | GAP Admin' };
export default async function AttendanceAdminPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  const { state } = await readWorkspace(true);
  const selected = state.cohorts.find(c => c.id === cohort) ?? state.cohorts.find(c => c.state === 'active') ?? state.cohorts[0];
  if (!selected) return <main className="px-6 py-12"><h1 className="text-3xl font-bold">Attendance</h1><p className="mt-4">Choose a cohort once your program is ready.</p></main>;
  const data = await readAttendanceAdmin(selected.id);
  return <AdminAttendance key={selected.id} cohortId={selected.id} data={data} />;
}
