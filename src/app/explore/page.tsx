import Link from 'next/link';
import { readExplore } from '@/lib/supabase/explore';
import { ExploreSwitcher } from '@/components/program/explore-shell';
import { PageContainer } from '@/components/ui/container';
import { StateMessage } from '@/components/ui/state-message';
import { formatCohortLabel } from '@/lib/program/state';
export const metadata={title:'Explore GAP | GAP'};
export default async function ExplorePage({ searchParams }: {searchParams:Promise<{cohort?:string}>}) {
  const {cohort:requested}=await searchParams;
  const {cohorts,cohort,weeks}=await readExplore(requested);
  return <><ExploreSwitcher cohorts={cohorts} selectedId={cohort?.id ?? ''} /><main><PageContainer className="py-9 sm:py-11"><header><p className="text-sm font-bold uppercase tracking-widest text-brand-deep">{cohort ? formatCohortLabel(cohort) : 'Program library'}</p><h1 className="mt-3 text-3xl font-bold">Explore GAP</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">Browse the workshops, resources and assignments. You’re viewing the program, not enrolled in this cohort.</p></header>{!cohort || !weeks.length ? <div className="mt-8"><StateMessage title="No program content available">Published program materials will appear here when they are ready.</StateMessage></div> : <section className="mt-10"><h2 className="text-2xl font-bold">Program modules</h2><ol className="mt-5 overflow-hidden rounded-card border border-border bg-surface">{weeks.map(w=>{
    const content=<><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-ink-faint">Week {w.weekNumber}</span><span className="mt-1 block font-bold">{w.title}</span><span className="mt-1 block text-sm text-ink-soft">{w.publicationState==='published'?'Available':'Upcoming · Not yet available'}</span></span>{w.publicationState==='published'?<span aria-hidden="true">→</span>:<svg aria-hidden="true" className="size-5 shrink-0 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>}</>;
    return <li key={w.id} className="border-b border-border last:border-0">{w.publicationState==='published'?<Link className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-surface-subtle sm:px-6" href={`/explore/week/${w.weekNumber}?cohort=${cohort.id}`}>{content}</Link>:<div className="flex min-h-20 items-center gap-4 px-5 py-4 sm:px-6">{content}</div>}</li>;
  })}</ol></section>}</PageContainer></main></>;
}
