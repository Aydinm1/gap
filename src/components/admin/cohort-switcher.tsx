"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ProgramCohort } from "@/lib/program/types";
import { compareCohorts, formatCohortLabel } from "@/lib/program/state";

export function CohortSwitcher({ cohorts, selectedId, onChange, label = 'Managing cohort' }: {
  cohorts: readonly ProgramCohort[];
  selectedId: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = cohorts.find(cohort => cohort.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div ref={root} className="relative w-full sm:w-auto"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
      <p id={`${id}-label`} className="mb-1 text-xs font-medium text-ink-soft">{label}</p>
      <button ref={trigger} type="button" disabled={!cohorts.length}
        aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(value => !value)}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-border-strong disabled:cursor-default disabled:opacity-60 sm:min-w-64">
        <span id={`${id}-value`} className="flex flex-1 flex-wrap items-center gap-2 text-sm font-bold">
          {selected ? formatCohortLabel(selected) : "No cohorts yet"}
          {selected ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${selected.state === "active" ? "bg-action/10 text-action" : "bg-surface-subtle text-ink-soft"}`}>{selected.state}</span> : null}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`size-4 shrink-0 text-ink-soft ${open ? "rotate-180" : ""}`}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open ? (
        <div id={`${id}-options`} aria-labelledby={`${id}-label`}
          className="absolute left-0 z-30 mt-2 max-h-[min(24rem,60dvh)] w-full overflow-y-auto rounded-card border border-border bg-surface p-2 shadow-lg">
          {(["active", "draft", "archived"] as const).map(state => {
            const group = cohorts.filter(cohort => cohort.state === state).toSorted(compareCohorts).reverse();
            if (!group.length) return null;
            return <div key={state} role="group" aria-labelledby={`${id}-${state}`} className="py-1">
              <p id={`${id}-${state}`} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{state}</p>
              {group.map(cohort => <button key={cohort.id} type="button" aria-pressed={cohort.id === selectedId}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-surface-subtle ${cohort.id === selectedId ? "bg-action/5 text-action" : "text-ink"}`}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                  if (cohort.id !== selectedId) onChange(cohort.id);
                }}>
                {formatCohortLabel(cohort)}
                {cohort.id === selectedId ? <span aria-hidden="true">✓</span> : null}
              </button>)}
            </div>;
          })}
        </div>
      ) : null}
    </div>
  );
}
