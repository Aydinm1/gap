'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { saveAttendance } from '@/lib/attendance/actions';
import { attendanceTime, isCheckInOpen, normalizeAttendanceCode, type AttendanceRecord, type AttendanceSession } from '@/lib/attendance/types';

export function MemberCheckIn({ sessionId, signedIn, session, title, weekNumber, receipt: initialReceipt }: {
  sessionId: string; signedIn: boolean; session?: AttendanceSession; title?: string; weekNumber?: number; receipt?: AttendanceRecord;
}) {
  const [code, setCode] = useState('');
  const [receipt, setReceipt] = useState(initialReceipt);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const storageKey = `gap-attendance:${sessionId}`;
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incoming = fragment.get('code');
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let nextCode = incoming?.slice(0,100) ?? '';
    try {
      if (incoming && incoming.length <= 100) sessionStorage.setItem(storageKey, incoming);
      const stored = sessionStorage.getItem(storageKey);
      if (stored) nextCode = stored;
    } catch { /* Fragment input still works when tab storage is unavailable. */ }
    const timer = window.setTimeout(() => { setCode(normalizeAttendanceCode(nextCode)); setNow(Date.now()); setReady(true); }, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => { window.clearTimeout(timer); window.clearInterval(clock); };
  }, [storageKey]);
  const open = session && isCheckInOpen(session, now);
  async function submit() {
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await saveAttendance({ action: 'check_in', sessionId, code });
      if (result.error) setError(result.error);
      else if (result.receipt) { setReceipt(result.receipt); try { sessionStorage.removeItem(storageKey); } catch {} }
      else setError('Attendance was not confirmed. Try again.');
    } catch { setError('Could not confirm attendance. Check your connection or sign in again, then retry. Your code is still here.'); }
    finally { setPending(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10"><section className="w-full max-w-lg rounded-card border border-border bg-surface p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-brand-deep">GAP workshop attendance</p>
    <h1 className="mt-3 text-2xl font-bold">{receipt?.present ? 'You’re checked in' : 'Workshop check-in'}</h1>
    {!signedIn ? <><p className="mt-4 leading-7 text-ink-soft">Sign in with your approved UC Davis Google account to continue. Scanning this code does not record attendance.</p>{ready ? <Link className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-action px-5 font-bold text-white" href={`/login?next=${encodeURIComponent(`/attendance/${sessionId}`)}`}>Sign in to check in</Link> : <p role="status" className="mt-4">Preparing sign-in…</p>}</> : !session ? <p role="alert" className="mt-4 leading-7">This workshop is unavailable for your current enrollment. Check that you have the right week or ask your GAP lead.</p> : <>
      <p className="mt-4 font-bold">Week {weekNumber} · {title}</p><p className="mt-2 text-sm text-ink-soft">Workshop date: {session.workshop_date}</p>
      {receipt?.present && receipt.recorded_at ? <p role="status" className="mt-6 rounded-lg bg-success-bg p-4 text-success-text">Present · {attendanceTime(receipt.recorded_at)}</p> : !ready ? <p role="status" className="mt-4">Loading check-in…</p> : !open ? <p role="status" className="mt-6">Check-in is closed. Ask your GAP lead to record attendance.</p> : <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}><label className="block text-sm font-bold" htmlFor="attendance-code">Six-character workshop code</label><input id="attendance-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={30} value={code} onChange={event => { setCode(event.target.value); try { sessionStorage.setItem(storageKey, event.target.value); } catch {} }} className="min-h-12 w-full rounded-lg border border-border-strong px-4 text-xl font-bold tracking-widest uppercase" /><p className="text-sm text-ink-soft">Closes {attendanceTime(session.closes_at)}. Confirm below to record your attendance.</p>{error ? <p role="alert" className="text-danger-text">{error}</p> : null}<Button type="submit" disabled={pending || !code.trim()} className="w-full">{pending ? 'Saving…' : 'Mark me present'}</Button></form>}
    </>}
    {signedIn ? <Link className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-action" href="/">← Back to program</Link> : null}
  </section></main>;
}
