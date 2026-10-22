import Link from 'next/link';
import type { AttendancePrompt } from '@/lib/attendance/types';
export function AttendancePrompts({ sessions, className = 'mt-6 flex flex-wrap gap-2' }: { sessions: AttendancePrompt[]; className?: string }) {
  return sessions.length ? <aside aria-label="Workshop attendance" className={className}>{sessions.map(session => <Link key={session.id} href={`/attendance/${session.id}`} aria-label={`Workshop check-in open — Week ${session.weekNumber}`} className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-action hover:bg-surface-subtle"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-action" /><span>Week {session.weekNumber} check-in</span><span className="text-xs font-medium text-ink-soft">Open</span><span aria-hidden="true" className="text-action">→</span></Link>)}</aside> : null;
}
