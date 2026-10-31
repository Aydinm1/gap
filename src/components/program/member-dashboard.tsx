"use client";

import Link from "next/link";
import { buildProgramDashboard } from "@/lib/program/dashboard";
import { useMemberAttempts } from "./member-workspace";
import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/container";
import { Progress } from "@/components/ui/progress";
import { StateMessage } from "@/components/ui/state-message";
import { AttendancePrompts } from "@/components/attendance/prompts";
import type { AttendancePrompt } from "@/lib/attendance/types";

type Input = Parameters<typeof buildProgramDashboard>[0];
export function MemberDashboard({ input, preview = false, attendance = [] }: { input: Omit<Input, "now"> & { now: string }; preview?: boolean; attendance?: AttendancePrompt[] }) {
  const [attempts] = useMemberAttempts(input.submissions);
  const dashboard = buildProgramDashboard({ ...input, submissions: attempts, now: new Date(input.now) });
  const priority = dashboard.priorityAssignment;
  const learning = dashboard.continueLearning;
  const featured = learning ?? priority;
  const destination = (href: string) => preview ? `/admin/preview${href}?cohort=${encodeURIComponent(input.cohort.id)}` : href;
  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11">
    <header className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">{dashboard.term}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{preview ? 'Member preview' : `Welcome back, ${dashboard.user.fullName.split(" ")[0]}`}</h1>{preview && input.cohort.state !== 'active' ? <p className="mt-3 text-sm text-warning-text">This cohort is {input.cohort.state}. Members can access it only while it is active.</p> : null}</div><AttendancePrompts sessions={attendance} className="flex shrink-0 flex-wrap gap-2" /></header>
    {dashboard.totalModules ? <section className="mt-11" aria-labelledby="modules-heading"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><h2 id="modules-heading" className="text-2xl font-bold tracking-[-0.025em]">Program modules</h2><div className="w-full sm:max-w-xs"><Progress value={dashboard.completedModules} max={dashboard.totalModules} label="Program progress" valueLabel={`${dashboard.completedModules} of ${dashboard.totalModules} complete`} /></div></div><div className="mt-5 overflow-hidden rounded-card border border-border bg-surface">
      <div className="border-b border-border bg-surface-subtle/60 px-5 py-4 sm:px-6">
        {featured ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-ink-soft">Continue where you left off</p>
            <h3 className="mt-1 text-base font-semibold leading-6">Week {featured.weekNumber}</h3>
          </div>
          <div className="shrink-0"><ButtonLink href={destination(featured.href)}>Continue <span aria-hidden="true">→</span></ButtonLink></div>
        </div> : <div><h3 className="font-bold">You’re caught up</h3></div>}
      </div>
      <ol>{dashboard.modules.map((module) => {
      const iconState = module.state === "locked" ? "locked" : module.assignmentState === "completed" ? "complete" : module.assignmentState === "submitted" ? "waiting" : module.assignmentState === "revision_requested" ? "revision" : "available";
      const content = <><ModuleIcon state={iconState} /><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[0.1em] text-ink-faint">Week {module.weekNumber}</span><span className="mt-1 block font-bold">{module.title}</span><span className="mt-1 block text-sm text-ink-soft">{module.assignmentState === "submitted" ? "Awaiting review" : module.assignmentState === "revision_requested" ? "Revision requested" : module.assignmentState === "completed" ? "Complete" : module.state === "locked" ? "Upcoming" : "Available"}{module.totalAssignments ? ` · ${module.completedAssignments} of ${module.totalAssignments} assignments complete` : ''}</span></span>{module.href ? <span aria-hidden="true" className="text-action">→</span> : null}</>;
      return <li key={module.id} className="border-b border-border last:border-0">{module.href ? <Link href={destination(module.href)} className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-surface-subtle sm:px-6">{content}</Link> : <div className="flex min-h-20 items-center gap-4 px-5 py-4 sm:px-6">{content}</div>}</li>;
    })}</ol></div></section> : <div className="mt-8"><StateMessage title="Your program is not available yet">Your modules will appear here when the program is ready.</StateMessage></div>}
  </PageContainer></main>;
}

function ModuleIcon({ state }: { state: "locked" | "complete" | "waiting" | "revision" | "available" }) {
  const tone = state === "complete" ? "bg-success-bg text-success-text" : state === "revision" ? "bg-warning-bg text-warning-text" : state === "waiting" ? "bg-info-bg text-info-text" : state === "available" ? "bg-action text-white" : "bg-surface-subtle text-ink-faint";
  return <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {state === "complete" ? <path d="m5 12 4 4L19 6" /> : state === "locked" ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> : state === "waiting" ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : state === "revision" ? <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
  </svg></span>;
}
