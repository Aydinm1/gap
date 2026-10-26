import type { Metadata } from "next";
import { AdminSubmissionReview } from "@/components/admin/admin-submission-review";
import { readWorkspace } from '@/lib/supabase/data';
import { readGradingReferences } from '@/lib/grading/data';

export const metadata: Metadata = { title: "Review submission | GAP" };

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await readWorkspace(true);
  const submission = state.submissions.find(s => s.id === id && s.isCurrent);
  const [reference] = await readGradingReferences(submission ? [submission.assignmentId] : []);
  return <AdminSubmissionReview key={id} submissionId={id} reference={reference} />;
}
