"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { formatDeadline } from "@/lib/program/state";
import { useAdminWorkspace } from "./admin-workspace";

export function AdminWeeks() {
  const workspace = useAdminWorkspace();
  const weeks = workspace.weeks.filter((week) => week.cohortId === workspace.selectedCohortId).toSorted((a, b) => a.weekNumber - b.weekNumber);
  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Program content</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Weeks</h1><p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">Prepare all six modules and control exactly when members can access them.</p>
    {weeks.length ? <ol className="mt-9 overflow-hidden rounded-card border border-border bg-surface shadow-card">{weeks.map((week) => <li key={week.id} className="border-b border-border last:border-0"><Link href={`/admin/weeks/${week.id}?cohort=${workspace.selectedCohortId}`} className="flex min-h-24 items-center gap-5 px-5 py-5 hover:bg-surface-subtle sm:px-7"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-subtle text-sm font-bold">{week.weekNumber}</span><span className="min-w-0 flex-1"><span className="block font-bold">{week.title}</span><span className="mt-1 block text-sm text-ink-soft">{week.assignment ? `${week.assignment.title} · ${formatDeadline(week.assignment.dueAt)}` : "No assignment configured"}</span></span><Badge tone={week.publicationState === "published" ? "success" : "neutral"}>{week.publicationState === "published" ? "Published" : "Draft"}</Badge><span aria-hidden="true" className="text-action">→</span></Link></li>)}</ol> : <div className="mt-9"><StateMessage title="No weeks in this cohort">New cohorts receive six draft weeks when they are created.</StateMessage></div>}
  </PageContainer></main>;
}
