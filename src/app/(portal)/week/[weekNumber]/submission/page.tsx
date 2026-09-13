import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionReviewWorkspace } from "@/components/program/submission-review-workspace";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import {
  MOCK_NOW,
  mockCohorts,
  mockEnrollments,
  mockSubmissions,
  mockWeeks,
} from "@/lib/program/mock-data";
import { buildWeekDetail } from "@/lib/program/week-detail";

type SubmissionReviewPageProps = {
  params: Promise<{ weekNumber: string }>;
};

function getDetail(weekNumber: string) {
  return buildWeekDetail({
    weeks: mockWeeks,
    weekNumber,
    cohortId: mockCohorts.fall2026.id,
    enrollmentId: mockEnrollments[0].id,
    submissions: mockSubmissions,
    now: MOCK_NOW,
  });
}

export async function generateMetadata({ params }: SubmissionReviewPageProps): Promise<Metadata> {
  const { weekNumber } = await params;
  const detail = getDetail(weekNumber);
  return { title: detail?.assignment ? `${detail.assignment.title} Review | GAP` : "Submission not found | GAP" };
}

export default async function SubmissionReviewPage({ params }: SubmissionReviewPageProps) {
  const { weekNumber } = await params;
  const detail = getDetail(weekNumber);
  if (!detail?.assignment) notFound();

  const attempts = detail.assignment.attempts;
  if (!attempts.some((attempt) => attempt.isCurrent)) notFound();

  return (
    <main className="pb-20 sm:pb-24">
      <PageContainer className="py-10 sm:py-14 lg:py-16">
        <Link href={`/week/${detail.week.weekNumber}`} className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover">
          <span className="mr-2" aria-hidden="true">←</span> Week {detail.week.weekNumber.toString().padStart(2, "0")}
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Submission review</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">{detail.assignment.title}</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-ink">Due {detail.assignment.dueLabel}</p>
        </header>

        <Card className="mt-8 overflow-hidden">
          <SubmissionReviewWorkspace
            assignmentId={detail.assignment.id}
            enrollmentId={mockEnrollments[0].id}
            initialAttempts={attempts}
          />
        </Card>
      </PageContainer>
    </main>
  );
}
