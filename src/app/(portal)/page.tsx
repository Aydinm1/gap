import type { Metadata } from "next";
import { MemberDashboard } from "@/components/program/member-dashboard";
import { readMember } from '@/lib/supabase/data';
import { readAttendancePrompts } from '@/lib/attendance/data';
import { PageContainer } from '@/components/ui/container';
import { StateMessage } from '@/components/ui/state-message';
export const metadata: Metadata = { title: "Program | GAP" };
export default async function DashboardPage() {
  const data = await readMember();
  if (!data.cohort || !data.enrollment) return <main><PageContainer className="py-12"><h1 className="mb-8 text-3xl font-bold">Welcome, {data.user.fullName.split(' ')[0]}</h1><StateMessage title="Your program is not available yet">Your modules will appear here when the program is ready.</StateMessage></PageContainer></main>;
  const attendance = await readAttendancePrompts(data.cohort.id);
  return <MemberDashboard attendance={attendance} input={{ ...data,cohort:data.cohort,enrollment:data.enrollment }} />;
}
