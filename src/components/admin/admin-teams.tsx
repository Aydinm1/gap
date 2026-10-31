'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { saveTeam } from '@/lib/teams/actions';
import { defaultTeam, nextTeamName } from '@/lib/teams/presentation';
import { useAdminWorkspace } from './admin-workspace';
import { Button } from '@/components/ui/button';
import type { CohortTeam } from '@/lib/program/types';

const control = 'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm';
const sameMembers = (a: readonly string[], b: readonly string[]) => JSON.stringify(a.toSorted()) === JSON.stringify(b.toSorted());

function TeamEditor({ team, onDirty, onSaved, onBusy, renderHeader }: {
  team: CohortTeam;
  onDirty: (dirty: boolean) => void;
  onSaved: (message: string) => void;
  onBusy: (busy: boolean) => void;
  renderHeader: (dirty: boolean) => ReactNode;
}) {
  const state = useAdminWorkspace();
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'members' | 'rename'>('view');
  const [name, setName] = useState(team.name);
  const [ids, setIds] = useState([...team.enrollmentIds]);
  const [message, setMessage] = useState('');
  const [busy, startTransition] = useTransition();
  const dirty = mode === 'rename' ? name !== team.name : mode === 'members' && !sameMembers(ids, team.enrollmentIds);
  const setUnsaved = state.setUnsavedChanges;

  useEffect(() => {
    setUnsaved(dirty);
    onDirty(dirty);
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const guard = (event: MouseEvent) => {
      if (dirty && (event.target as Element).closest('a') && !window.confirm('Discard unsaved team changes?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guard, true);
    return () => {
      setUnsaved(false);
      onDirty(false);
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guard, true);
    };
  }, [dirty, setUnsaved, onDirty]);

  function cancel() {
    setName(team.name);
    setIds([...team.enrollmentIds]);
    setMessage('');
    setMode('view');
  }

  function save(action: 'rename' | 'members' | 'delete') {
    if (busy) return;
    if (action === 'delete' && !window.confirm(`Delete ${team.name}? Only an unlocked team without work can be deleted.`)) return;
    setMessage('');
    onBusy(true);
    startTransition(async () => {
      try {
        const result = await saveTeam(action, { id: team.id, version: team.version, name, enrollmentIds: ids });
        if (result.error) setMessage(result.error);
        else {
          setMode('view');
          setUnsaved(false);
          onSaved(action === 'delete' ? 'Team deleted.' : action === 'rename' ? 'Team name saved.' : 'Team members saved.');
          router.refresh();
        }
      } catch {
        setMessage('Could not save. Your changes are kept; retry.');
      } finally { onBusy(false); }
    });
  }

  const personName = (id: string) => state.people.find(person => person.id === state.enrollments.find(enrollment => enrollment.id === id)?.personId)?.fullName ?? 'Participant';
  const assigned = team.enrollmentIds.toSorted((a, b) => personName(a).localeCompare(personName(b)));
  const participants = state.enrollments.filter(enrollment => enrollment.cohortId === team.cohortId
    && (enrollment.participationStatus === 'enrolled' || team.enrollmentIds.includes(enrollment.id))
    && !!enrollment.isTest === team.isTest)
    .toSorted((a, b) => Number(team.enrollmentIds.includes(b.id)) - Number(team.enrollmentIds.includes(a.id)) || personName(a.id).localeCompare(personName(b.id)));

  return <>{renderHeader(dirty)}<div className="border-t border-border p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">Assigned participants</h3>
      {mode === 'view' ? <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy || team.locked} onClick={() => { setMessage(''); setMode('members'); }}>Edit members</Button>
        <details className="relative text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-soft">Team actions</summary>
          <div className="mt-2 flex flex-wrap gap-2 sm:absolute sm:right-0 sm:z-10 sm:w-48 sm:rounded-lg sm:border sm:border-border sm:bg-surface sm:p-2 sm:shadow-card">
            <Button variant="quiet" disabled={busy} onClick={() => { setMessage(''); setMode('rename'); }}>Rename team</Button>
            <Button variant="quiet" disabled={busy || team.locked} onClick={() => save('delete')}>Delete team</Button>
          </div>
        </details>
      </div> : null}
    </div>

    {mode === 'rename' ? <form className="mt-4 rounded-lg bg-surface-subtle p-4" onSubmit={event => { event.preventDefault(); save('rename'); }}>
      <label className="block text-sm font-semibold">Team name<input autoFocus maxLength={100} className={'mt-2 ' + control} value={name} disabled={busy} onChange={event => { setName(event.target.value); onDirty(event.target.value !== team.name); }} /></label>
      <div className="mt-3 flex flex-wrap gap-2"><Button type="submit" disabled={busy || !name.trim() || name === team.name}>{busy ? 'Saving…' : 'Save name'}</Button><Button variant="quiet" disabled={busy} onClick={cancel}>Cancel</Button></div>
    </form> : null}

    {mode === 'members' ? <form onSubmit={event => { event.preventDefault(); save('members'); }}>
      <fieldset disabled={busy || team.locked} className="mt-4">
        <legend className="sr-only">Choose assigned participants</legend>
        <div className="grid gap-1 sm:grid-cols-2">{participants.map(enrollment => {
          const other = state.teams?.find(candidate => candidate.id !== team.id && candidate.enrollmentIds.includes(enrollment.id));
          return <label key={enrollment.id} className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 shrink-0 accent-action" checked={ids.includes(enrollment.id)} disabled={!!other}
              onChange={event => { const next = event.target.checked ? [...ids, enrollment.id] : ids.filter(id => id !== enrollment.id); setIds(next); onDirty(!sameMembers(next, team.enrollmentIds)); }} />
            <span className="min-w-0 break-words">{personName(enrollment.id)}{other ? ` · ${other.name}` : ''}{enrollment.participationStatus !== 'enrolled' ? ` · ${enrollment.participationStatus}` : ''}</span>
          </label>;
        })}</div>
      </fieldset>
      <div className="mt-5 flex flex-wrap gap-2"><Button type="submit" disabled={busy || team.locked || sameMembers(ids, team.enrollmentIds)}>{busy ? 'Saving…' : 'Save members'}</Button><Button variant="quiet" disabled={busy} onClick={cancel}>Cancel</Button></div>
    </form> : assigned.length ? <ul aria-label="Assigned participants" className="mt-4 grid gap-x-8 sm:grid-cols-2">{assigned.map(id => <li key={id} className="flex min-h-11 items-center text-sm">{personName(id)}</li>)}</ul>
      : <p className="mt-4 text-sm text-ink-soft">No participants assigned. Choose Edit members to build this team.</p>}
    {message ? <p role="alert" className="mt-3 text-sm text-danger-text">{message}</p> : null}
  </div></>;
}

function TeamsPanel({ onDirty, dirty }: { onDirty: (dirty: boolean) => void; dirty: boolean }) {
  const state = useAdminWorkspace();
  const router = useRouter();
  const teams = (state.teams?.filter(team => team.cohortId === state.selectedCohortId) ?? [])
    .toSorted((a, b) => Number(a.isTest) - Number(b.isTest) || a.name.localeCompare(b.name, undefined, { numeric: true }) || a.id.localeCompare(b.id));
  const [selected, setSelected] = useState(() => defaultTeam(teams)?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [isTest, setIsTest] = useState(false);
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [busy, startTransition] = useTransition();
  const [editingBusy, setEditingBusy] = useState(false);
  const team = teams.find(candidate => candidate.id === selected) ?? defaultTeam(teams);
  const suggestedName = nextTeamName(teams);
  const unassigned = state.enrollments.filter(enrollment => enrollment.cohortId === state.selectedCohortId
    && enrollment.participationStatus === 'enrolled' && !enrollment.isTest && !teams.some(candidate => candidate.enrollmentIds.includes(enrollment.id)));

  const renderHeader = (hasUnsaved = false) => <div className="p-5 sm:p-6">
    <label className="block max-w-md text-sm font-semibold">Select team<select className={'mt-2 ' + control} disabled={busy || editingBusy || !teams.length} value={team?.id ?? ''} onChange={event => {
      if (hasUnsaved && !window.confirm('Switch teams? Any unsaved team edits will be discarded.')) {
        event.currentTarget.value = team?.id ?? '';
        return;
      }
      setSelected(event.target.value); setMessage('');
    }}>{!teams.length ? <option value="">No teams yet</option> : teams.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}{candidate.isTest ? ' · Test' : ''}</option>)}</select></label>
    {team ? <><p className="mt-3 text-sm text-ink-soft">{team.enrollmentIds.length} {team.enrollmentIds.length === 1 ? 'member' : 'members'} · {team.isTest ? 'Test team' : 'Official team'}</p>
      <p className="mt-1 text-xs text-ink-soft">{team.locked ? 'Membership locked after research or submission' : 'Membership editable until first research save or submission'}</p></> : <p className="mt-3 text-sm text-ink-soft">Add a team to begin assigning participants.</p>}
  </div>;

  function create() {
    if (busy || editingBusy) return;
    if (dirty && !window.confirm('Create and select a new team? Unsaved team edits will be discarded.')) return;
    setCreateError('');
    startTransition(async () => {
      try {
        const result = await saveTeam('create', { name: suggestedName, isTest, cohortId: state.selectedCohortId });
        if (result.error) {
          setCreateError(result.error);
          if (result.code === 'name_conflict') router.refresh();
        } else {
          if (result.id) setSelected(result.id);
          setCreating(false);
          setIsTest(false);
          setMessage(`${suggestedName} created. Choose Edit members to assign participants.`);
          router.refresh();
        }
      } catch { setCreateError('Could not create team. Retry when your connection is restored.'); }
    });
  }

  return <section aria-label="Teams" className="mt-12 border-t border-border pt-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">Teams</h2><p className="mt-2 text-sm text-ink-soft">{unassigned.length} unassigned participants.</p></div>
      <Button variant="secondary" disabled={busy || editingBusy || !state.selectedCohortId} onClick={() => { setCreating(value => !value); setCreateError(''); }}>Add team</Button>
    </div>
    {unassigned.length ? <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold">Unassigned participants</summary><ul className="mt-2 space-y-1">{unassigned.map(enrollment => <li key={enrollment.id}>{state.people.find(person => person.id === enrollment.personId)?.fullName}</li>)}</ul></details> : null}
    {creating ? <form aria-label="Add team" className="mt-4 rounded-card border border-border bg-surface p-5" onSubmit={event => { event.preventDefault(); create(); }}>
      <p className="font-semibold">Create {suggestedName}</p>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-action" checked={isTest} disabled={busy} onChange={event => setIsTest(event.target.checked)} />Test team</label>
      <div className="mt-3 flex flex-wrap gap-2"><Button type="submit" disabled={busy || editingBusy}>{busy ? 'Creating…' : 'Create team'}</Button><Button variant="quiet" disabled={busy} onClick={() => { setCreating(false); setCreateError(''); }}>Cancel</Button></div>
      {createError ? <p role="alert" className="mt-3 text-sm text-danger-text">{createError}</p> : null}
    </form> : null}
    {message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}
    <div className="mt-5 rounded-card border border-border bg-surface">
      {team ? <TeamEditor key={team.id + ':' + team.version} team={team} onDirty={onDirty} onSaved={setMessage} onBusy={setEditingBusy} renderHeader={renderHeader} /> : renderHeader()}
    </div>
  </section>;
}

export function AdminTeams({ onDirty, dirty = false }: { onDirty: (dirty: boolean) => void; dirty?: boolean }) {
  const { selectedCohortId } = useAdminWorkspace();
  return <TeamsPanel key={selectedCohortId} onDirty={onDirty} dirty={dirty} />;
}
