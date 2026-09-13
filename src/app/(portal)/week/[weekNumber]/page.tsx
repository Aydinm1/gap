import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionWorkspace } from "@/components/program/submission-workspace";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import {
  MOCK_NOW,
  mockCohorts,
  mockEnrollments,
  mockSubmissions,
  mockWeeks,
} from "@/lib/program/mock-data";
import { buildWeekDetail } from "@/lib/program/week-detail";

type WeekPageProps = { params: Promise<{ weekNumber: string }> };

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

export async function generateMetadata({ params }: WeekPageProps): Promise<Metadata> {
  const { weekNumber } = await params;
  const detail = getDetail(weekNumber);
  return { title: detail ? `${detail.week.title} | GAP` : "Week not found | GAP" };
}

const resourceLabels = {
  guide: "Guide",
  template: "Template",
  reading: "Reading",
  video: "Video",
} as const;

export default async function WeekDetailPage({ params }: WeekPageProps) {
  const { weekNumber } = await params;
  const detail = getDetail(weekNumber);
  if (!detail) notFound();

  return (
    <main className="pb-20 sm:pb-24">
      <PageContainer className="py-10 sm:py-14 lg:py-16">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover">
          <span className="mr-2" aria-hidden="true">←</span> Program
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {detail.week.weekNumber.toString().padStart(2, "0")}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{detail.week.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg">{detail.week.description}</p>
        </header>

        <div className="mt-12 space-y-12 lg:mt-14">
          <section aria-labelledby="assignment-heading">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Your work</p>
            <h2 id="assignment-heading" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Assignment</h2>
            {detail.assignment ? (
              <Card className="mt-5 overflow-hidden">
                <div className="border-b border-border px-6 py-6 sm:px-8 lg:px-10 lg:py-8">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">{detail.assignment.title}</h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-ink">Due {detail.assignment.dueLabel}</p>
                  </div>
                </div>
                <SubmissionWorkspace
                  assignmentId={detail.assignment.id}
                  enrollmentId={mockEnrollments[0].id}
                  unsubmittedState={detail.assignment.unsubmittedState}
                  instructions={detail.assignment.instructions}
                  initialAttempts={detail.assignment.attempts}
                  reviewPath={`/week/${detail.week.weekNumber}/submission`}
                />
              </Card>
            ) : <div className="mt-5"><StateMessage title="No assignment this week">Focus on the workshop and resources. There is nothing to submit.</StateMessage></div>}
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
            <section aria-labelledby="workshop-heading">
              <Card className="p-6 sm:p-7 lg:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Workshop</p>
                <h2 id="workshop-heading" className="mt-2 text-xl font-bold tracking-[-0.02em]">Presentation</h2>
                <p className="mt-4 text-sm leading-6 text-ink-soft">Revisit the slides from this week’s session.</p>
                <div className="mt-6">
                  {detail.week.slidesUrl ? (
                    <a href={detail.week.slidesUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover">View presentation <span className="ml-2" aria-hidden="true">↗</span></a>
                  ) : <span className="text-sm text-ink-faint">Not available</span>}
                </div>
              </Card>
            </section>

            <section aria-labelledby="resources-heading">
              <Card className="overflow-hidden">
                <div className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7 lg:px-8 lg:pt-8">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Reference library</p>
                  <h2 id="resources-heading" className="mt-2 text-xl font-bold tracking-[-0.02em]">Additional resources</h2>
                </div>
                {detail.week.resources.length ? (
                  <ol className="border-t border-border">
                    {detail.week.resources.map((resource) => (
                      <li key={resource.id} className="border-b border-border last:border-b-0">
                        <a href={resource.url} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between gap-5 px-6 py-4 transition-colors hover:bg-surface-subtle sm:px-7 lg:px-8">
                          <span>
                            <span className="block font-bold text-ink">{resource.title}</span>
                            {resource.description ? <span className="mt-1 block text-sm leading-6 text-ink-soft">{resource.description}</span> : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="hidden text-xs font-bold text-ink-faint sm:inline">{resourceLabels[resource.type]}</span>
                            <span className="text-action" aria-hidden="true">↗</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : <div className="px-6 pb-6 sm:px-7 lg:px-8 lg:pb-8"><StateMessage title="No additional resources">Everything needed for this week is included in the workshop presentation.</StateMessage></div>}
              </Card>
            </section>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
