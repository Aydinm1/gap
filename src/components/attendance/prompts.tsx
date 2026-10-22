import Link from 'next/link';
import type { AttendancePrompt } from '@/lib/attendance/types';
export function AttendancePrompts({ sessions }: { sessions: AttendancePrompt[] }) {
  return sessions.length ? <aside aria-label="Workshop attendance" className="mt-6 space-y-2">{sessions.map(session => <Link key={session.id} href={`/attendance/${session.id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-success-bg px-4 py-3 text-sm font-bold text-success-text"><span>Workshop check-in open — Week {session.weekNumber}</span><span>Check in →</span></Link>)}</aside> : null;
}
