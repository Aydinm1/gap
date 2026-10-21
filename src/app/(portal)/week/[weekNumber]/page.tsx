import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readWeek } from '@/lib/supabase/data';
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
  return <WeekContent detail={detail} />;
}
