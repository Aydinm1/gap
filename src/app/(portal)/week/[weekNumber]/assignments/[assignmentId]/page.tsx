import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readWeek } from '@/lib/supabase/data';
import { AssignmentContent } from '@/components/program/assignment-content';
type Props = { params: Promise<{ weekNumber: string; assignmentId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const {weekNumber,assignmentId} = await params;
  const detail = await readWeek(weekNumber), assignment = detail?.assignments.find(a => a.id === assignmentId);
  return {title: assignment ? `${assignment.title} | GAP` : 'Assignment not found | GAP'};
}
export default async function AssignmentPage({ params }: Props) {
  const {weekNumber,assignmentId} = await params;
  const detail = await readWeek(weekNumber), assignment = detail?.assignments.find(a => a.id === assignmentId);
  if (!detail || !assignment) notFound();
  return <AssignmentContent assignment={assignment} weekNumber={detail.week.weekNumber} enrollmentId={detail.enrollmentId} weekHref={`/week/${detail.week.weekNumber}`} />;
}
