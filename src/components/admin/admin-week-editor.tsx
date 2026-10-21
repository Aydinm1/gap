"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { formatPacificDateTimeInput, pacificWallTimeToUtc, validateAdminWeek, type AdminWeek } from "@/lib/program/admin";
import { assignmentsForWeek, type Assignment, type Resource } from "@/lib/program/types";
import { useAdminWorkspace } from "./admin-workspace";

import { AssignmentBriefUpload } from "./assignment-brief-upload";

const input = "mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-base text-ink";

export function AdminWeekEditor({ weekId }: { weekId: string }) {
  const workspace = useAdminWorkspace();
  const source = workspace.weeks.find((week) => week.id === weekId && week.cohortId === workspace.selectedCohortId);
  const [draft, setDraft] = useState<AdminWeek | undefined>(source ? structuredClone(source) : undefined);
  const [savedDraft, setSavedDraft] = useState(source);
  const [message, setMessage] = useState("");
  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => Object.fromEntries(source ? assignmentsForWeek(source).map((assignment) => [assignment.id, formatPacificDateTimeInput(assignment.dueAt)]) : []));
  const [zones, setZones] = useState<Record<string, "PDT" | "PST" | undefined>>({});
  const [saving, startSaving] = useTransition();
  const dirty = Boolean(savedDraft && draft && (JSON.stringify(draft) !== JSON.stringify(savedDraft) || assignmentsForWeek(draft).some((assignment) => deadlines[assignment.id] !== formatPacificDateTimeInput(assignment.dueAt))));
  const setUnsavedChanges = workspace.setUnsavedChanges;
  useEffect(() => { setUnsavedChanges(dirty); return () => setUnsavedChanges(false); }, [dirty, setUnsavedChanges]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  if (!source || !draft) return <PageContainer className="py-16"><StateMessage title="Week not found">Choose a week from the currently selected cohort.</StateMessage></PageContainer>;

  function patch(values: Partial<AdminWeek>) { setDraft((current) => current ? { ...current, ...values } : current); setMessage(""); }
  function save(publicationState: AdminWeek["publicationState"]) {
    if (!draft) return;
    const assignments: Assignment[] = [];
    for (const assignment of assignmentsForWeek(draft)) {
      const converted = pacificWallTimeToUtc(deadlines[assignment.id] ?? "", zones[assignment.id]);
      if (converted.error) return setMessage(converted.error);
      if (!converted.value) return setMessage("Enter a valid Pacific deadline.");
      assignments.push({ ...assignment, dueAt: converted.value });
    }
    const candidate = { ...draft, assignment: undefined, assignments, expectedAssignmentIds: savedDraft ? assignmentsForWeek(savedDraft).map(a => a.id) : [], publicationState, resources: draft.resources.map((resource, index) => ({ ...resource, sortOrder: index + 1 })) };
    const error = validateAdminWeek(candidate, { forPublish: publicationState === "published" });
    if (error) return setMessage(error);
    startSaving(async () => {
      const error = await workspace.updateWeek(candidate);
      if (error) return setMessage(error);
      // Compare edits with the successfully saved draft, not regenerated resource IDs.
      setDraft(candidate);
      setSavedDraft(candidate);
      workspace.setUnsavedChanges(false);
      setMessage(publicationState === "published" ? "Week published." : "Draft saved.");
    });
  }
  function updateResource(id: string, values: Partial<Resource>) { if (!draft) return; patch({ resources: draft.resources.map((resource) => resource.id === id ? { ...resource, ...values } : resource) }); }
  function moveResource(index: number, direction: -1 | 1) { if (!draft) return; const next = [...draft.resources]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; patch({ resources: next }); }
  function updateAssignment(id: string, values: Partial<Assignment>) { if (!draft) return; patch({ assignment: undefined, assignments: assignmentsForWeek(draft).map((assignment) => assignment.id === id ? { ...assignment, ...values } : assignment) }); }

  return <main className="pb-28"><PageContainer className="py-9 sm:py-11"><Link href={`/admin/weeks?cohort=${workspace.selectedCohortId}`} onClick={(event) => { if (dirty && !window.confirm("Discard your unsaved week changes?")) event.preventDefault(); }} className="inline-flex min-h-11 items-center text-sm font-bold text-action">← All weeks</Link><header className="mt-6"><div className="flex flex-wrap items-center gap-3"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {draft.weekNumber.toString().padStart(2, "0")}</p><span className="text-sm font-semibold capitalize text-ink-faint">{source.publicationState}</span></div><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{draft.title || `Week ${draft.weekNumber}`}</h1></header>
    <div className="mt-10 space-y-8">
      <Card className="p-6 sm:p-8"><h2 className="text-xl font-bold">Week</h2><div className="mt-6 grid gap-6"><label className="text-sm font-bold">Title<input className={input} value={draft.title} onChange={(event) => patch({ title: event.target.value })} /></label><label className="text-sm font-bold">Description<textarea rows={4} className={`${input} py-3`} value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></label><label className="text-sm font-bold">Presentation URL<input className={input} type="url" value={draft.slidesUrl ?? ""} onChange={(event) => patch({ slidesUrl: event.target.value || undefined })} placeholder="https://..." /></label></div></Card>
      <section aria-label="Assignments" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Assignments</h2><Button variant="secondary" disabled={saving} onClick={() => { const id = crypto.randomUUID(); const dueAt = new Date().toISOString(); patch({ assignment: undefined, assignments: [...assignmentsForWeek(draft), { id, weekNumber: draft.weekNumber, title: "", instructions: "", dueAt }] }); setDeadlines((current) => ({ ...current, [id]: formatPacificDateTimeInput(dueAt) })); }}>Add assignment</Button></div>
        {assignmentsForWeek(draft).map((assignment, index) => {
          const persisted = assignmentsForWeek(source).find((item) => item.id === assignment.id);
          return <Card key={assignment.id} className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-lg font-bold">Assignment {index + 1}</h3><Button variant="quiet" disabled={saving} onClick={() => { if (workspace.submissions.some((item) => item.assignmentId === assignment.id)) return setMessage("This assignment cannot be removed because it has submissions."); if (persisted?.document) return setMessage("This assignment cannot be removed because it has an attached PDF."); if (window.confirm("Remove this assignment from the week?")) patch({ assignment: undefined, assignments: assignmentsForWeek(draft).filter((item) => item.id !== assignment.id) }); }}>Remove assignment</Button></div>
            <div className="mt-6 grid gap-6"><label className="text-sm font-bold">Title<input className={input} value={assignment.title} onChange={(event) => updateAssignment(assignment.id, { title: event.target.value })} /></label><label className="text-sm font-bold">Instructions<textarea rows={5} className={`${input} py-3`} value={assignment.instructions} onChange={(event) => updateAssignment(assignment.id, { instructions: event.target.value })} /></label>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-bold">Deadline (Pacific time)<input className={input} type="datetime-local" value={deadlines[assignment.id] ?? ""} onChange={(event) => { setDeadlines((current) => ({ ...current, [assignment.id]: event.target.value })); setZones((current) => ({ ...current, [assignment.id]: undefined })); setMessage(""); }} /></label><label className="text-sm font-bold">DST choice<select className={input} value={zones[assignment.id] ?? ""} onChange={(event) => setZones((current) => ({ ...current, [assignment.id]: event.target.value ? event.target.value as "PDT" | "PST" : undefined }))}><option value="">Automatic</option><option value="PDT">PDT</option><option value="PST">PST</option></select></label></div>
              {persisted ? <AssignmentBriefUpload key={persisted.id} assignment={persisted} /> : <p className="text-sm text-ink-soft">Save the assignment draft first, then attach its PDF.</p>}
            </div>
          </Card>;
        })}
        {!assignmentsForWeek(draft).length ? <p className="text-sm text-ink-soft">This week has no submission requirement.</p> : null}
      </section>
      <Card className="p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Resources</h2><Button variant="secondary" onClick={() => patch({ resources: [...draft.resources, { id: `resource-${crypto.randomUUID()}`, title: "", url: "", type: "guide", sortOrder: draft.resources.length + 1 }] })}>Add resource</Button></div><div className="mt-6 space-y-5">{draft.resources.map((resource, index) => <div key={resource.id} className="rounded-card border border-border bg-surface-subtle p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Title<input className={input} value={resource.title} onChange={(event) => updateResource(resource.id, { title: event.target.value })} /></label><label className="text-sm font-bold">Type<select className={input} value={resource.type} onChange={(event) => updateResource(resource.id, { type: event.target.value as Resource["type"] })}>{["guide", "template", "reading", "video"].map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-sm font-bold sm:col-span-2">URL<input className={input} value={resource.url} onChange={(event) => updateResource(resource.id, { url: event.target.value })} /></label></div><div className="mt-4 flex flex-wrap gap-2"><Button size="compact" variant="quiet" disabled={index === 0} onClick={() => moveResource(index, -1)}>Move up</Button><Button size="compact" variant="quiet" disabled={index === draft.resources.length - 1} onClick={() => moveResource(index, 1)}>Move down</Button><Button size="compact" variant="quiet" onClick={() => patch({ resources: draft.resources.filter((item) => item.id !== resource.id) })}>Remove</Button></div></div>)}</div></Card>
    </div>
    <div className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-strong bg-surface p-4 shadow-lg"><div>{message ? <p className={`text-sm font-bold ${/saved|published/.test(message) ? "text-success-text" : "text-danger-text"}`} role="status">{message}</p> : dirty ? <p className="text-sm font-bold text-warning-text">Unsaved changes</p> : <p className="text-sm text-ink-soft">All changes saved</p>}</div><div className="flex flex-wrap gap-3">{source.publicationState === "published" ? <><Button variant="secondary" disabled={saving} onClick={() => { if (window.confirm("Return this week to draft? Members will lose access.")) save("draft"); }}>Return to draft</Button><Button disabled={!dirty || saving} onClick={() => save("published")}>{saving ? "Saving…" : "Save changes"}</Button></> : <><Button variant="secondary" disabled={!dirty || saving} onClick={() => save("draft")}>Save draft</Button><Button disabled={saving} onClick={() => save("published")}>Save &amp; publish</Button></>}</div></div>
  </PageContainer></main>;
}
