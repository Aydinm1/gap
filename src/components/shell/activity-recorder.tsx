'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { recordActivity } from '@/lib/supabase/activity';

/** Visible authorized page visits only; no interval, prefetch or background refresh. */
export function ActivityRecorder() {
  const pathname = usePathname();
  const lastSent = useRef(0);
  useEffect(() => {
    let pending = false;
    const visit = async () => {
      if (document.visibilityState !== 'visible' || pending || Date.now()-lastSent.current < 300_000) return;
      pending = true;
      try { if ((await recordActivity()).ok) lastSent.current = Date.now(); }
      catch { /* Nonessential telemetry must never interrupt the application. */ }
      finally { pending = false; }
    };
    void visit();
    document.addEventListener('visibilitychange',visit);
    return () => document.removeEventListener('visibilitychange',visit);
  }, [pathname]);
  return null;
}
