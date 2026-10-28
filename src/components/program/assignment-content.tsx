import Link from 'next/link';
import { PageContainer } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { AssignmentBrief } from './assignment-brief';
import { SubmissionWorkspace } from './submission-workspace';
import type { AssignmentDetail } from '@/lib/program/week-detail';
import { PracticeSubmission } from './practice-submission';

export function AssignmentContent({ assignment, weekNumber, enrollmentId, weekHref, preview = false, browse = false }: {
  assignment: AssignmentDetail; weekNumber: number; enrollmentId: string; weekHref: string; preview?: boolean; browse?: boolean;
}) {
  return <main className="pb-20 sm:pb-24"><PageContainer className="py-9 sm:py-11">
    <div className="mx-auto max-w-3xl">
      <Link href={weekHref} className="inline-flex min-h-11 items-center text-sm font-bold text-action">← Week {String(weekNumber).padStart(2,'0')}</Link>
      <header className="mt-6 border-b border-border pb-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {String(weekNumber).padStart(2,'0')} · Assignment</p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{assignment.title}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-soft">Due {assignment.dueLabel}</p>
        {assignment.summary ? <p className="mt-5 text-lg leading-8 text-ink-soft">{assignment.summary}</p> : null}
        {assignment.document ? <a href={`/api/assignment-briefs/${assignment.document.id}/download`} className="mt-5 inline-flex min-h-11 max-w-full items-center break-words text-sm font-bold text-action underline underline-offset-4">Download assignment PDF · {assignment.document.name}</a> : null}
      </header>
      <section aria-label="Assignment instructions" className="py-9 sm:py-11"><AssignmentBrief instructions={assignment.instructions} format={assignment.instructionsFormat} /></section>
      {assignment.submissionMode==='team' ? <section aria-label="Your team" className="mb-6 rounded-card border border-border bg-surface-subtle p-5"><h2 className="font-bold">{assignment.team?.name ?? 'Team assignment'}</h2><p className="mt-2 text-sm text-ink-soft">One submission for your team. Any teammate can submit or replace work before it is complete.</p>{assignment.team ? <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">{assignment.team.members.map(m=><li key={m.enrollmentId}>{m.name}</li>)}</ul> : !preview&&!browse ? <p className="mt-3 text-sm font-bold">Ask your GAP lead to assign your team before submitting.</p>:null}</section>:null}
      <Card className="p-6 sm:p-8">{browse ? <PracticeSubmission key={assignment.id} assignmentId={assignment.id} /> : assignment.submissionMode==='team'&&!assignment.team&&!preview ? <p className="text-sm text-ink-soft">Submission opens after your admin assigns your team.</p> : <SubmissionWorkspace assignmentId={assignment.id} enrollmentId={enrollmentId}
        unsubmittedState={assignment.unsubmittedState} initialAttempts={assignment.attempts} readOnly={preview} completionCredit={assignment.completionCredit}
        reviewPath={`/week/${weekNumber}/submission?assignment=${encodeURIComponent(assignment.id)}`} />}</Card>
    </div>
  </PageContainer></main>;
}
