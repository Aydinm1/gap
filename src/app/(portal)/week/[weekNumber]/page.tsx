import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readWeek, readMember } from '@/lib/supabase/data';
import { readAttendancePrompts } from '@/lib/attendance/data';
import { WeekContent } from '@/components/program/week-content';

type WeekPageProps = { params: Promise<{ weekNumber: string }> };

export async function generateMetadata({ params }: WeekPageProps): Promise<Metadata> {
  const { weekNumber } = await params;
  const detail = await readWeek(weekNumber);
  return { title: detail ? `${detail.week.title} | GAP` : "Week not found | GAP" };
}

export default async function WeekDetailPage({ params }: WeekPageProps) {
  const { weekNumber } = await params;
  const detail = await readWeek(weekNumber);
  if (!detail) notFound();
  const member = await readMember();
  const attendance = member.cohort ? (await readAttendancePrompts(member.cohort.id)).filter(s => s.weekNumber === detail.week.weekNumber) : [];
  return <WeekContent detail={detail} attendance={attendance} />;
}
