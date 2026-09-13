"use client";

import Link from "next/link";
import { buildProgramDashboard } from "@/lib/program/dashboard";
import { useMemberAttempts } from "./member-workspace";
import { AssignmentStatusBadge } from "./assignment-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { Progress } from "@/components/ui/progress";
import { StateMessage } from "@/components/ui/state-message";

type Input = Parameters<typeof buildProgramDashboard>[0];
export function MemberDashboard({ input }: { input: Omit<Input, "now"> & { now: string } }) {
  const [attempts] = useMemberAttempts(input.submissions);
  const dashboard = buildProgramDashboard({ ...input, submissions: attempts, now: new Date(input.now) });
  const priority = dashboard.priorityAssignment;
  const learning = dashboard.continueLearning;
  const featured = learning ?? priority;
  const weekTitle = dashboard.modules.find((module) => module.weekNumber === featured?.weekNumber)?.title;
  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11">
    <header><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">{dashboard.term}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Welcome back, {dashboard.user.fullName.split(" ")[0]}</h1></header>
    <section className="mt-8" aria-label="Current week">
      {featured ? <Card className="overflow-hidden">
        <div className={priority ? "grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : ""}>
          <div className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Continue where you left off</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold leading-tight tracking-[-0.025em] sm:text-3xl">{weekTitle ?? featured.title}</h2>
            <div className="mt-5"><ButtonLink href={featured.href}>Continue Week {featured.weekNumber} <span aria-hidden="true">→</span></ButtonLink></div>
          </div>
          {priority ? <div className="border-t border-border bg-surface-subtle/40 p-6 sm:p-7 lg:border-l lg:border-t-0">
            <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">Assignment</p><AssignmentStatusBadge state={priority.state} /></div>
            <h3 className="mt-3 text-lg font-bold">{priority.title}</h3>
            {priority.weekNumber !== featured.weekNumber ? <p className="mt-1 text-xs font-semibold text-ink-soft">Week {priority.weekNumber}</p> : null}
            <p className="mt-2 text-sm leading-6 text-ink-soft">Due {priority.dueLabel}</p>
            {priority.state === "revision_requested" ? <p className="mt-3 text-sm leading-6 text-ink-soft">Your reviewer left feedback. Read it before updating your work.</p> : null}
            <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover" href={priority.actionHref}>{priority.actionLabel} <span className="ml-2" aria-hidden="true">→</span></Link>
          </div> : null}
        </div>
      </Card> : <StateMessage title={dashboard.totalModules ? "You’re caught up" : "Your program is not available yet"}>{dashboard.totalModules ? "No work needs your attention right now. You can revisit published weeks below." : "Your modules will appear here when the program is ready."}</StateMessage>}
    </section>
    {dashboard.totalModules ? <section className="mt-11" aria-labelledby="modules-heading"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><h2 id="modules-heading" className="text-2xl font-bold tracking-[-0.025em]">Program modules</h2><div className="w-full sm:max-w-xs"><Progress value={dashboard.completedModules} max={dashboard.totalModules} label="Program progress" valueLabel={`${dashboard.completedModules} of ${dashboard.totalModules} complete`} /></div></div><ol className="mt-5 overflow-hidden rounded-card border border-border bg-surface">{dashboard.modules.map((module) => {
      const iconState = module.state === "locked" ? "locked" : module.assignmentState === "completed" ? "complete" : module.assignmentState === "submitted" ? "waiting" : module.assignmentState === "revision_requested" ? "revision" : "available";
      const content = <><ModuleIcon state={iconState} /><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[0.1em] text-ink-faint">Week {module.weekNumber}</span><span className="mt-1 block font-bold">{module.title}</span><span className="mt-1 block text-sm text-ink-soft">{module.assignmentState === "submitted" ? "Awaiting review" : module.assignmentState === "revision_requested" ? "Revision requested" : module.assignmentState === "completed" ? "Complete" : module.state === "locked" ? "Upcoming · Not yet available" : "Available"}</span></span>{module.href ? <span aria-hidden="true" className="text-action">→</span> : null}</>;
      return <li key={module.id} className="border-b border-border last:border-0">{module.href ? <Link href={module.href} className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-surface-subtle sm:px-6">{content}</Link> : <div className="flex min-h-20 items-center gap-4 px-5 py-4 sm:px-6">{content}</div>}</li>;
    })}</ol></section> : null}
  </PageContainer></main>;
}

function ModuleIcon({ state }: { state: "locked" | "complete" | "waiting" | "revision" | "available" }) {
  const tone = state === "complete" ? "bg-success-bg text-success-text" : state === "revision" ? "bg-warning-bg text-warning-text" : state === "waiting" ? "bg-info-bg text-info-text" : state === "available" ? "bg-action text-white" : "bg-surface-subtle text-ink-faint";
  return <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {state === "complete" ? <path d="m5 12 4 4L19 6" /> : state === "locked" ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> : state === "waiting" ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : state === "revision" ? <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
  </svg></span>;
}
