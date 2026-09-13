import type { Metadata } from "next";
import { AdminSubmissionReview } from "@/components/admin/admin-submission-review";

export const metadata: Metadata = { title: "Review submission | GAP" };

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSubmissionReview submissionId={id} />;
}
