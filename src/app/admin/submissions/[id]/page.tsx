import type { Metadata } from "next";
import { AdminSubmissionReview } from "@/components/admin/admin-submission-review";
import { readWorkspace } from '@/lib/supabase/data';
import { readGradingReferences } from '@/lib/grading/data';
import { readGuidedProject } from '@/lib/guided/data';
import { assignmentsForWeek } from '@/lib/program/types';

export const metadata: Metadata = { title: "Review submission | GAP" };

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await readWorkspace(true);
  const submission = state.submissions.find(s => s.id === id && s.isCurrent);
  const [reference] = await readGradingReferences(submission ? [submission.assignmentId] : []);
  const assignment=state.weeks.flatMap(assignmentsForWeek).find(a=>a.id===submission?.assignmentId);
  const project=assignment?.workflow==='guided'&&submission?.teamId?await readGuidedProject(assignment.id,submission.teamId):undefined;
  return <AdminSubmissionReview key={id} submissionId={id} reference={reference} project={project?{...project,teams:undefined}:undefined} />;
}
