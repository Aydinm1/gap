"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AssignmentStatusBadge } from "@/components/program/assignment-status-badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { filterSubmissionRows, getAdminQueueCounts, getCurrentAdminWeek, getSubmissionRows, type AdminQueueFilter } from "@/lib/program/admin";
import { calculateCohortMetrics } from "@/lib/program/cohorts";
import { MOCK_NOW } from "@/lib/program/mock-data";
import { formatDeadline } from "@/lib/program/state";
import { useAdminWorkspace } from "./admin-workspace";

const filters: { value: AdminQueueFilter; label: string }[] = [
  { value: "awaiting_review", label: "Awaiting review" }, { value: "revision_requested", label: "Revisions requested" },
  { value: "missing", label: "Missing" }, { value: "complete", label: "Complete" }, { value: "all", label: "All" },
];
const percentage = (value: number | undefined, numerator: number, denominator: number) => value === undefined ? "—" : `${Math.round(value * 100)}% (${numerator}/${denominator})`;
const compactPacific = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));

export function AdminOverview() {
  const workspace = useAdminWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const cohortWeeks = workspace.weeks.filter((week) => week.cohortId === workspace.selectedCohortId);
  const currentWeek = getCurrentAdminWeek(cohortWeeks);
  const selectedWeek = cohortWeeks.find((week) => week.id === params.get("week") && week.assignment) ?? currentWeek;
  const requestedFilter = params.get("status") as AdminQueueFilter | null;
  const filter = filters.some((item) => item.value === requestedFilter) ? requestedFilter! : "awaiting_review";
  const search = params.get("q") ?? "";
  const rows = selectedWeek ? getSubmissionRows({ state: workspace, cohortId: workspace.selectedCohortId, weekId: selectedWeek.id, now: MOCK_NOW }) : [];
  const visibleRows = filterSubmissionRows(rows, filter, search);
  const counts = getAdminQueueCounts(rows);
  const cohortEnrollments = workspace.enrollments.filter((item) => item.cohortId === workspace.selectedCohortId);
  const activeMembers = cohortEnrollments.filter((item) => item.participationStatus === "enrolled").length;
  const metrics = calculateCohortMetrics(cohortEnrollments);

  function updateQuery(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.set("cohort", workspace.selectedCohortId);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(`/admin?${next.toString()}#submissions`);
  }
  const returnQuery = new URLSearchParams({ cohort: workspace.selectedCohortId, week: selectedWeek?.id ?? "", status: filter });
  if (search) returnQuery.set("q", search);

  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11">
    <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Admin workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Review queue</h1><p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">Work through submissions that need a decision, then manage weeks and cohort access.</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Current assignment summary">{[["Active members", activeMembers], ["Awaiting review", counts.awaiting_review], ["Revisions requested", counts.revision_requested], ["Missing", counts.missing]].map(([label, value]) => <Card className="p-5" key={label}><p className="text-sm font-semibold text-ink-soft">{label}</p><p className="mt-2 text-3xl font-bold tracking-[-0.03em]">{value}</p></Card>)}</section>
    <section id="submissions" className="mt-11" aria-labelledby="submissions-heading">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Submissions</p><h2 id="submissions-heading" className="mt-2 text-2xl font-bold">{selectedWeek ? `Week ${selectedWeek.weekNumber}: ${selectedWeek.assignment?.title}` : "No assignment selected"}</h2>{selectedWeek?.assignment ? <p className="mt-2 text-sm text-ink-soft">Deadline {formatDeadline(selectedWeek.assignment.dueAt)} · Pacific time</p> : null}</div><label className="text-sm font-bold text-ink">Assignment<select value={selectedWeek?.id ?? ""} onChange={(event) => updateQuery({ week: event.target.value })} className="mt-2 block min-h-10 w-full rounded-lg border border-border-strong bg-surface px-3 font-semibold lg:w-auto">{cohortWeeks.filter((week) => week.assignment).map((week) => <option key={week.id} value={week.id}>Week {week.weekNumber}: {week.title}</option>)}</select></label></div>
      {selectedWeek ? <><div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2" aria-label="Filter submissions">{filters.map((item) => <button key={item.value} type="button" onClick={() => updateQuery({ status: item.value })} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${filter === item.value ? "border-action bg-action text-white" : "border-border-strong bg-surface text-ink-soft hover:bg-surface-subtle"}`}>{item.label} <span className="ml-1 opacity-80">{counts[item.value]}</span></button>)}</div><label className="sr-only" htmlFor="queue-search">Search members</label><input id="queue-search" type="search" value={search} onChange={(event) => updateQuery({ q: event.target.value })} placeholder="Search members" className="min-h-11 rounded-lg border border-border-strong bg-surface px-4 text-sm xl:w-72" /></div>
        {visibleRows.length ? <><div className="mt-5 hidden overflow-hidden rounded-card border border-border bg-surface md:block"><table className="w-full border-collapse text-left text-sm"><thead className="bg-surface-subtle text-xs uppercase tracking-[0.1em] text-ink-faint"><tr><th className="px-5 py-4">Member</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4 text-right">Next action</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.enrollment.id} className="border-t border-border"><td className="px-5 py-4"><span className="block font-bold">{row.person?.fullName}</span><span className="mt-1 block text-xs text-ink-soft">{row.person?.email}</span></td><td className="px-5 py-4"><AssignmentStatusBadge state={row.state} /></td><td className="px-5 py-4 text-ink-soft">{row.submission ? compactPacific(row.submission.submittedAt) : "—"}</td><td className="px-5 py-4 text-right">{row.submission ? <Link className="inline-flex min-h-11 items-center font-bold text-action hover:text-action-hover" href={`/admin/submissions/${row.submission.id}?${returnQuery.toString()}`}>{row.state === "submitted" ? "Review →" : "View →"}</Link> : <span className="text-ink-faint">Await submission</span>}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-4 md:hidden">{visibleRows.map((row) => <Card key={row.enrollment.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{row.person?.fullName}</p><p className="mt-1 text-xs text-ink-soft">{row.person?.email}</p></div><AssignmentStatusBadge state={row.state} /></div><p className="mt-4 text-sm text-ink-soft">{row.submission ? `Submitted ${compactPacific(row.submission.submittedAt)}` : "No submission"}</p>{row.submission ? <Link className="mt-3 inline-flex min-h-11 items-center font-bold text-action" href={`/admin/submissions/${row.submission.id}?${returnQuery.toString()}`}>{row.state === "submitted" ? "Review submission →" : "View submission →"}</Link> : null}</Card>)}</div></> : <div className="mt-5"><StateMessage title={filter === "awaiting_review" ? "You’re caught up" : "No matching submissions"}>{filter === "awaiting_review" ? "There are no submissions waiting for a decision in this assignment." : "Try another status or clear the member search."}</StateMessage></div>}</> : <div className="mt-6"><StateMessage title="No assignments yet">Add an assignment to a cohort week to begin tracking submissions.</StateMessage></div>}
    </section>
    <section className="mt-14 border-t border-border pt-10" aria-labelledby="outcomes-heading"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Cohort snapshot</p><h2 id="outcomes-heading" className="mt-2 text-2xl font-bold">Outcomes</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card className="p-5"><p className="text-sm text-ink-soft">Starters</p><p className="mt-2 text-2xl font-bold">{metrics.starters}</p><p className="mt-2 text-xs text-ink-soft">{metrics.withdrew} withdrawn · {metrics.pendingDecisions} pending</p></Card><Card className="p-5"><p className="text-sm text-ink-soft">Advancement</p><p className="mt-2 text-2xl font-bold">{percentage(metrics.advancementRate, metrics.promoted, metrics.promoted + metrics.notPromoted)}</p></Card><Card className="p-5"><p className="text-sm text-ink-soft">Offer yield</p><p className="mt-2 text-2xl font-bold">{percentage(metrics.offerYield, metrics.joined, metrics.joined + metrics.declined)}</p><p className="mt-2 text-xs text-ink-soft">{metrics.pendingResponses} pending responses</p></Card><Card className="p-5"><p className="text-sm text-ink-soft">End-to-end</p><p className="mt-2 text-2xl font-bold">{percentage(metrics.endToEndConversion, metrics.joined, metrics.starters)}</p></Card></div></section>
  </PageContainer></main>;
}
