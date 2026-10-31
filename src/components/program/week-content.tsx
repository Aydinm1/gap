import Link from "next/link";
import { AttendancePrompts } from "@/components/attendance/prompts";
import type { AttendancePrompt } from "@/lib/attendance/types";
import { AssignmentStatusBadge } from './assignment-status-badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import type { WeekDetailViewModel } from "@/lib/program/week-detail";

const resourceLabels = {
  guide: "Guide",
  template: "Template",
  reading: "Reading",
  video: "Video",
  workshop: "Workshop",
} as const;

export function WeekContent({ detail, programHref = '/', preview = false, browse = false, attendance = [] }: {
  detail: WeekDetailViewModel & { enrollmentId?: string }; programHref?: string; preview?: boolean; browse?: boolean; attendance?: AttendancePrompt[];
}) {
  return (
    <main className="pb-20 sm:pb-24">
      <PageContainer className="py-9 sm:py-11">
        <Link href={programHref} className="action-link inline-flex min-h-11 items-center text-sm font-bold text-action">
          <span className="mr-2" aria-hidden="true">←</span> Program
        </Link>

        <header className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {detail.week.weekNumber.toString().padStart(2, "0")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{detail.week.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg">{detail.week.description}</p>
          <a href="#materials" className="action-link mt-3 inline-flex min-h-11 items-center text-sm font-bold text-action">View materials ↓</a>
        </header>

        <AttendancePrompts sessions={attendance} />
        <div className="mt-10 space-y-12 lg:mt-12">
          <section id="assignment" aria-labelledby="assignment-heading">
            {detail.assignments.length ? (
              <div className="space-y-4">
                <h2 id="assignment-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">{detail.assignments.length === 1 ? 'Assignment' : 'Assignments'}</h2>
                {detail.assignments.map((assignment) => <article key={assignment.id} id={`assignment-${assignment.id}`} aria-labelledby={`title-${assignment.id}`} className="rounded-card border border-border bg-surface p-6 sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                    <div className="min-w-0"><h3 id={`title-${assignment.id}`} className="break-words text-xl font-bold tracking-tight">{assignment.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">Due {assignment.dueLabel}</p>
                      {assignment.summary ? <p className="mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-7 text-ink-soft">{assignment.summary}</p> : null}
                      {!browse ? <div className="mt-3"><AssignmentStatusBadge state={assignment.state} /></div> : null}
                    </div>
                    <ButtonLink className="shrink-0 self-start sm:self-center" variant="secondary" href={browse
                      ? `/explore/week/${detail.week.weekNumber}/assignments/${encodeURIComponent(assignment.id)}${programHref.includes('?') ? `?${programHref.split('?')[1]}` : ''}` : preview
                      ? `${programHref.split('?')[0]}/week/${detail.week.weekNumber}/assignments/${encodeURIComponent(assignment.id)}${programHref.includes('?') ? `?${programHref.split('?')[1]}` : ''}`
                      : `/week/${detail.week.weekNumber}/assignments/${encodeURIComponent(assignment.id)}`} aria-label={`View assignment: ${assignment.title}`}>View assignment <span className="ml-2" aria-hidden="true">→</span></ButtonLink>
                  </div>
                </article>)}
              </div>
            ) : (
              <>
                <h2 id="assignment-heading" className="text-2xl font-bold tracking-[-0.025em]">Assignment</h2>
                <div className="mt-5"><StateMessage title="No assignment this week" /></div>
              </>
            )}
          </section>

          <section id="materials" aria-labelledby="materials-heading">
            <h2 id="materials-heading" className="text-2xl font-bold tracking-[-0.025em]">Materials</h2>

            {detail.week.slidesUrl || detail.week.resources.length ? (
              <Card className="mt-5 overflow-hidden">
                <ol>
                  {detail.week.slidesUrl ? (
                    <li className="border-b border-border last:border-b-0">
                      <a href={detail.week.slidesUrl} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between gap-5 px-6 py-4 transition-colors hover:bg-surface-subtle sm:px-8">
                        <span>
                          <span className="block font-bold text-ink">Workshop presentation</span>
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
              <div className="mt-5"><StateMessage title="No materials this week" /></div>
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
