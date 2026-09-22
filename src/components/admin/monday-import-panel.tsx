'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mondayImport } from '@/lib/monday/actions';
import type { ImportBatch } from '@/lib/monday/types';
import { useAdminWorkspace } from './admin-workspace';
import { formatCohortLabel } from '@/lib/program/state';

export function MondayImportPanel() {
  const { cohorts } = useAdminWorkspace();
  const [batch, setBatch] = useState<ImportBatch>();
  const [mapping, setMapping] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = batch && JSON.stringify(mapping) !== JSON.stringify(batch.mappings);
  const ready = batch?.rows.filter(r => ['ready','needs_link'].includes(r.eligibility) && !['enrolled','linked'].includes(r.result?.status || '')).length || 0;
  async function run(action: 'preview' | 'map' | 'confirm') {
    setBusy(true); setError('');
    try {
      const response = await mondayImport(action, batch?.id, mapping);
      if (response.error) setError(response.error);
      if (response.batch) { setBatch(response.batch); setMapping(response.batch.mappings); }
    } catch { setError('Could not reach GAP. Your preview is retained; retry when connected.'); }
    finally { setBusy(false); }
  }
  const choices = [...new Map(batch?.rows.filter(r => r.cohortKey).map(r => [r.cohortKey,r.cohortLabel])).entries()];
  return <Card className="mt-6 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Monday enrollment</h2><p className="mt-1 text-sm text-ink-soft">Preview checked members, match cohorts, then confirm. Monday stays unchanged.</p></div>
      <Button variant="secondary" disabled={busy} onClick={() => run('preview')}>{batch ? 'Reload preview' : 'Sync from Monday'}</Button></div>
    {busy ? <p role="status" className="mt-4 text-sm">Processing…</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-danger-text">{error}</p> : null}
    {batch ? <div className="mt-5 space-y-4">
      <p className="text-xs text-ink-soft">Preview expires at {new Date(batch.expiresAt).toLocaleTimeString()}. Changed Monday records require a fresh preview.</p>
      {!batch.rows.length ? <p>No checked members to import.</p> : <>
        {choices.map(([key,label]) => <label key={key} className="block text-sm font-semibold">Monday: {label}
          <select disabled={busy || batch.rows.some(r => r.result)} value={mapping[key] || ''} onChange={e => setMapping({...mapping,[key]:e.target.value})}
            className="mt-2 block min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3">
            <option value="">Choose GAP cohort</option>{cohorts.filter(c => c.state !== 'archived').map(c => <option key={c.id} value={c.id}>{formatCohortLabel(c)} · {c.state}</option>)}
          </select></label>)}
        <Button variant="secondary" disabled={busy || !dirty} onClick={() => run('map')}>Check mapped enrollments</Button>
        <ul className="divide-y divide-border">{batch.rows.map(row => <li key={row.id} className="py-4 text-sm">
          <p className="font-bold">{row.name || 'Missing name'}</p><p className="break-all text-ink-soft">{row.email || 'Missing email'}</p>
          <p className="mt-1 text-ink-soft">{row.cohortLabel || 'No cohort'} · {row.status || 'No membership status'}</p>
          <p className="mt-2" role="status">{row.result?.message || row.reason || ({ ready:'Ready to enroll',needs_link:'Existing enrollment — link Monday record',already_linked:'Already linked',blocked:'Needs correction' }[row.eligibility])}</p>
        </li>)}</ul>
        <Button disabled={busy || !!dirty || !ready} onClick={() => run('confirm')}>Confirm {ready} enrollment{ready === 1 ? '' : 's'}</Button>
      </>}
    </div> : null}
  </Card>;
}
