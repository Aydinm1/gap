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
      <PageContainer className="py-9 sm:py-11">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover">
          <span className="mr-2" aria-hidden="true">←</span> Program
        </Link>

        <header className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {detail.week.weekNumber.toString().padStart(2, "0")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{detail.week.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg">{detail.week.description}</p>
          <a href="#materials" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-action">View materials ↓</a>
        </header>

        <div className="mt-10 space-y-12 lg:mt-12">
          <section id="assignment" aria-labelledby="assignment-heading">
            {detail.assignment ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Assignment</p>
                <h2 id="assignment-heading" className="mt-2 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{detail.assignment.title}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-ink-soft">Due {detail.assignment.dueLabel}</p>
                <Card className="mt-5 overflow-hidden">
                  <SubmissionWorkspace
                    assignmentId={detail.assignment.id}
                    enrollmentId={mockEnrollments[0].id}
                    unsubmittedState={detail.assignment.unsubmittedState}
                    instructions={detail.assignment.instructions}
                    initialAttempts={detail.assignment.attempts}
                    reviewPath={`/week/${detail.week.weekNumber}/submission`}
                  />
                </Card>
              </>
            ) : (
              <>
                <h2 id="assignment-heading" className="text-2xl font-bold tracking-[-0.025em]">Assignment</h2>
                <div className="mt-5"><StateMessage title="No assignment this week">Focus on the workshop and resources. There is nothing to submit.</StateMessage></div>
              </>
            )}
          </section>

          <section id="materials" aria-labelledby="materials-heading">
            <h2 id="materials-heading" className="text-2xl font-bold tracking-[-0.025em]">Materials</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">Use the workshop presentation and references to complete this week’s assignment.</p>

            {detail.week.slidesUrl || detail.week.resources.length ? (
              <Card className="mt-5 overflow-hidden">
                <ol>
                  {detail.week.slidesUrl ? (
                    <li className="border-b border-border last:border-b-0">
                      <a href={detail.week.slidesUrl} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between gap-5 px-6 py-4 transition-colors hover:bg-surface-subtle sm:px-8">
                        <span>
                          <span className="block font-bold text-ink">Workshop presentation</span>
                          <span className="mt-1 block text-sm leading-6 text-ink-soft">Revisit the slides from this week’s session.</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="hidden text-xs font-bold text-ink-faint sm:inline">Slides</span>
                          <span className="text-action" aria-hidden="true">↗</span>
                        </span>
                      </a>
                    </li>
                  ) : null}
                  {detail.week.resources.map((resource) => (
                    <li key={resource.id} className="border-b border-border last:border-b-0">
                      <a href={resource.url} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between gap-5 px-6 py-4 transition-colors hover:bg-surface-subtle sm:px-8">
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
              </Card>
            ) : (
              <div className="mt-5"><StateMessage title="No materials this week">Everything needed to complete this week is included in the assignment instructions.</StateMessage></div>
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
