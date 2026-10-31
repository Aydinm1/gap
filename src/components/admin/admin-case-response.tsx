'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { formatSubmissionTime } from '@/lib/program/state';
import type { CaseExercise } from '@/lib/cases/types';

const methods: Record<string, string> = { mathematical: 'Mathematical decomposition', process: 'Process decomposition', decision: 'Decision decomposition' };

export function AdminCaseResponse({ name, email, title, weekNumber, isTest, exercise, backHref }: {
  name: string; email: string; title: string; weekNumber: number; isTest: boolean; exercise: CaseExercise; backHref: string;
}) {
  const [number, setNumber] = useState(1);
  const current = exercise.cases.find(c => c.number === number), answered = exercise.cases.filter(c => c.answer).length;
  return <main className="pb-20"><PageContainer className="py-9 sm:py-11">
    <Link href={backHref} className="action-link inline-flex min-h-11 items-center text-sm font-bold text-action">← Case progress</Link>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-widest text-brand-deep">Week {weekNumber} · {title}</p><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold sm:text-4xl">{name}</h1><Badge tone={exercise.run?.completedAt ? 'success' : answered ? 'info' : 'neutral'}>{exercise.run?.completedAt ? 'Complete' : answered ? 'In progress' : 'Not started'}</Badge>{isTest ? <Badge>Test participant</Badge> : null}</div><p className="mt-2 break-all text-sm text-ink-soft">{email}</p><p className="mt-3 text-sm text-ink-soft">{exercise.run?.completedAt ? `Finished ${formatSubmissionTime(exercise.run.completedAt)}` : `${answered} of 8 cases saved`} · Read only</p></header>
    {current ? <>
      <nav aria-label="Cases" className="mt-8 flex flex-wrap gap-2">{exercise.cases.map(c => <button key={c.number} type="button" aria-pressed={number === c.number} aria-label={`Case ${c.number}${c.answer ? ' · Saved' : ' · Not saved'}`} onClick={() => setNumber(c.number)} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${number === c.number ? 'border-action bg-success-bg text-action' : 'border-border bg-surface hover:bg-surface-subtle'}`}>{c.number}{c.answer ? <span aria-hidden="true" className="ml-2 text-success-text">✓</span> : null}</button>)}</nav>
      <section className="mt-6 rounded-card border border-border bg-surface p-5 sm:p-7" aria-labelledby="case-title"><h2 id="case-title" className="text-xl font-bold">Case {current.number} · {current.title}</h2><div className="mt-4"><AssignmentBrief instructions={current.scenario} format="markdown" /></div></section>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <section aria-labelledby="saved-response" className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-7"><h2 id="saved-response" className="text-lg font-bold">Participant response</h2>{current.answer ? <dl className="mt-5 space-y-6 text-sm leading-7"><div><dt className="font-bold">Decomposition method</dt><dd className="mt-1">{methods[current.answer.method] ?? current.answer.method}</dd></div><div><dt className="font-bold">Problem breakdown</dt><dd className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{current.answer.framework}</dd></div><div><dt className="font-bold">First investigation and why</dt><dd className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{current.answer.priority}</dd></div></dl> : <p className="mt-4 text-sm text-ink-soft">No saved response for this case.</p>}</section>
        <section aria-labelledby="reference-approach" className="min-w-0 rounded-card border border-border bg-surface-subtle p-5 sm:p-7"><h2 id="reference-approach" className="text-lg font-bold">Reference approach</h2><p className="mt-2 text-xs text-ink-soft">One possible approach, not the only correct answer.</p><div className="mt-5">{current.reference ? <AssignmentBrief instructions={current.reference} format="markdown" /> : <p className="text-sm text-ink-soft">No reference configured.</p>}</div></section>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3"><Button variant="secondary" disabled={number === 1} onClick={() => setNumber(n => n - 1)}>← Previous case</Button><Button variant="secondary" disabled={number === exercise.cases.length} onClick={() => setNumber(n => n + 1)}>Next case →</Button></div>
    </> : <p className="mt-8 text-sm text-ink-soft">This exercise has not been configured yet.</p>}
  </PageContainer></main>;
}
