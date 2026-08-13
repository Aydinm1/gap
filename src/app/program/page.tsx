import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/program/assignment-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { Progress } from "@/components/ui/progress";
import { StateMessage } from "@/components/ui/state-message";
import { buildProgramDashboard } from "@/lib/program/dashboard";
import {
  MOCK_NOW,
  mockCohorts,
  mockEnrollments,
  mockSubmissions,
  mockUsers,
  mockWeeks,
} from "@/lib/program/mock-data";
import { cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Program | GAP" };

const dashboard = buildProgramDashboard({
  user: mockUsers.member,
  cohort: mockCohorts.fall2026,
  enrollment: mockEnrollments[0],
  weeks: mockWeeks,
  submissions: mockSubmissions,
  now: MOCK_NOW,
});

const moduleSymbols = {
  complete: "✓",
  current: "●",
  available: "→",
  locked: "○",
} as const;

export default function ProgramPage() {
  const firstName = dashboard.user.fullName.split(" ")[0];

  return (
    <main className="pb-20 sm:pb-24">
      <PageContainer className="py-10 sm:py-14 lg:py-16">
        <section aria-labelledby="program-heading">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">
            {dashboard.term}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 id="program-heading" className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-3 text-base text-ink-soft">
                {dashboard.currentWeekNumber
                  ? `Week ${dashboard.currentWeekNumber} of ${dashboard.totalModules}`
                  : "You are caught up with all published modules."}
              </p>
            </div>
          </div>
          {dashboard.totalModules > 0 ? (
            <div className="mt-8 max-w-xl">
              <Progress
                value={dashboard.completedModules}
                max={dashboard.totalModules}
                label="Modules complete"
              />
            </div>
          ) : null}
        </section>

        {dashboard.totalModules === 0 ? (
          <div className="mt-12">
            <StateMessage title="Program modules are not available yet">
              Check back after the program team publishes the module schedule.
            </StateMessage>
          </div>
        ) : (
          <>
            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
              {dashboard.continueLearning ? (
                <Card className="flex flex-col overflow-hidden border-action/30 p-7 sm:p-9">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">
                    Continue learning
                  </p>
                  <p className="mt-7 text-sm font-bold text-ink-soft">
                    Week {dashboard.continueLearning.weekNumber.toString().padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                    {dashboard.continueLearning.title}
                  </h2>
                  <p className="mt-4 max-w-2xl flex-1 text-base leading-7 text-ink-soft">
                    {dashboard.continueLearning.description}
                  </p>
                  <div className="mt-8">
                    <ButtonLink href={dashboard.continueLearning.href}>
                      Open Week {dashboard.continueLearning.weekNumber}
                      <span aria-hidden="true">→</span>
                    </ButtonLink>
                  </div>
                </Card>
              ) : (
                <StateMessage title="You are caught up">
                  There are no unfinished published modules right now. New material will appear here when it is ready.
                </StateMessage>
              )}

              {dashboard.priorityAssignment ? (
                <Card className="flex flex-col p-7 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">
                      Your priority
                    </p>
                    <AssignmentStatusBadge state={dashboard.priorityAssignment.state} />
                  </div>
                  <h2 className="mt-6 text-xl font-bold tracking-[-0.02em]">
                    {dashboard.priorityAssignment.title}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink-soft">
                    Due {dashboard.priorityAssignment.dueLabel}
                  </p>
                  {dashboard.priorityAssignment.feedback ? (
                    <div className="mt-6 border-l-2 border-warning-text pl-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-warning-text">
                        Latest feedback
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {dashboard.priorityAssignment.feedback}
                      </p>
                    </div>
                  ) : null}
                  <Link
                    href={dashboard.priorityAssignment.href}
                    className="mt-auto inline-flex min-h-11 items-center pt-7 text-sm font-bold text-action hover:text-action-hover"
                  >
                    Review assignment <span className="ml-2" aria-hidden="true">→</span>
                  </Link>
                </Card>
              ) : (
                <StateMessage title="Nothing is due right now">
                  Your next assignment will appear here when a published module includes one.
                </StateMessage>
              )}
            </div>

            <section className="mt-16" aria-labelledby="modules-heading">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">
                Six-week program
              </p>
              <h2 id="modules-heading" className="mt-2 text-2xl font-bold tracking-[-0.025em]">
                Program modules
              </h2>
              <ol className="mt-6 overflow-hidden rounded-card border border-border bg-surface shadow-card">
                {dashboard.modules.map((module) => {
                  const content = (
                    <>
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                          module.state === "complete" && "bg-success-bg text-success-text",
                          module.state === "current" && "bg-action text-white",
                          module.state === "available" && "bg-info-bg text-info-text",
                          module.state === "locked" && "bg-surface-subtle text-ink-faint",
                        )}
                        aria-hidden="true"
                      >
                        {moduleSymbols[module.state]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
                          Week {module.weekNumber}
                        </span>
                        <span className="mt-1 block font-bold text-ink">{module.title}</span>
                      </span>
                      <span className="text-sm font-semibold text-ink-soft">
                        {module.state === "complete"
                          ? "Complete"
                          : module.state === "current"
                            ? "Continue"
                            : module.state === "locked"
                              ? "Locked"
                              : "Open"}
                      </span>
                    </>
                  );

                  return (
                    <li key={module.id} className="border-b border-border last:border-b-0">
                      {module.href ? (
                        <Link
                          href={module.href}
                          className="flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-subtle sm:px-6"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          className="flex min-h-20 items-center gap-4 px-5 py-4 sm:px-6"
                          aria-label={`Week ${module.weekNumber}, ${module.title}, locked`}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
