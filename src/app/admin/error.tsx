'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-bold">Could not load the admin workspace</h1><p className="mt-4 text-ink-soft">Try again. If this continues, contact your GAP lead.</p><button className="mt-6 min-h-11 font-bold text-action" onClick={reset}>Try again</button></main>;
}
