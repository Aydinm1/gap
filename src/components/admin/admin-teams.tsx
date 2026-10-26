'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveTeam } from '@/lib/teams/actions';
import { useAdminWorkspace } from './admin-workspace';
import { Button } from '@/components/ui/button';
import type { CohortTeam } from '@/lib/program/types';

const control='min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm';
function TeamEditor({team,onDirty}:{team:CohortTeam;onDirty:(dirty:boolean)=>void}) {
 const state=useAdminWorkspace(),router=useRouter();
 const [name,setName]=useState(team.name),[ids,setIds]=useState([...team.enrollmentIds]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const dirty=name!==team.name||JSON.stringify([...ids].sort())!==JSON.stringify([...team.enrollmentIds].sort());
 const setUnsaved=state.setUnsavedChanges;
 useEffect(()=>{
  setUnsaved(dirty);onDirty(dirty);const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};
  const guard=(e:MouseEvent)=>{if(dirty&&(e.target as Element).closest('a')&&!window.confirm('Discard unsaved team changes?')){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',warn);document.addEventListener('click',guard,true);
  return()=>{setUnsaved(false);onDirty(false);window.removeEventListener('beforeunload',warn);document.removeEventListener('click',guard,true);};
 },[dirty,setUnsaved,onDirty]);
 async function save(action:'rename'|'members'|'delete'){
  if(action==='rename'&&JSON.stringify([...ids].sort())!==JSON.stringify([...team.enrollmentIds].sort())&&!window.confirm('Save the team name and discard the unsaved member selection?'))return;
  if(action==='members'&&name!==team.name&&!window.confirm('Save the members and discard the unsaved team name?'))return;
  if(action==='delete'&&!window.confirm(`Delete ${team.name}? Only an unlocked team without work can be deleted.`))return;
  setBusy(true);setMessage('');
  try{const result=await saveTeam(action,{id:team.id,version:team.version,name,enrollmentIds:ids});if(result.error)setMessage(result.error);else{setUnsaved(false);router.refresh();setMessage('Team saved.');}}
  catch{setMessage('Could not save. Your changes are kept; retry.');}finally{setBusy(false);}
 }
 const participants=state.enrollments.filter(e=>e.cohortId===team.cohortId&&(e.participationStatus==='enrolled'||team.enrollmentIds.includes(e.id))&&!!e.isTest===team.isTest&&(!team.locked||team.enrollmentIds.includes(e.id)));
 return <div className="mt-5 rounded-card border border-border p-5">
  <p className="text-xs font-bold text-ink-soft">{team.isTest?'Test team · excluded from official totals':'Official team'} · {team.locked?'Membership locked after submission':'Membership editable until first submission'}</p>
  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="grow text-sm font-bold">Team name<input className={'mt-2 '+control} value={name} onChange={e=>setName(e.target.value)}/></label><Button variant="secondary" disabled={busy||name===team.name} onClick={()=>save('rename')}>Save name</Button></div>
  <fieldset disabled={busy||team.locked} className="mt-5"><legend className="text-sm font-bold">Assigned participants</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{participants.map(e=>{const other=state.teams?.find(t=>t.id!==team.id&&t.enrollmentIds.includes(e.id));return <label key={e.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-action" checked={ids.includes(e.id)} disabled={!!other} onChange={event=>setIds(current=>event.target.checked?[...current,e.id]:current.filter(id=>id!==e.id))}/><span>{state.people.find(p=>p.id===e.personId)?.fullName}{other?` · ${other.name}`:''}{e.participationStatus!=='enrolled'?` · ${e.participationStatus}`:''}</span></label>;})}</div></fieldset>
  <div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy||team.locked||JSON.stringify([...ids].sort())===JSON.stringify([...team.enrollmentIds].sort())} onClick={()=>save('members')}>Save members</Button><Button variant="quiet" disabled={busy||team.locked} onClick={()=>save('delete')}>Delete team</Button></div>
  {message?<p role="status" className="mt-3 text-sm font-semibold">{message}</p>:null}
 </div>;
}
export function AdminTeams({onDirty,dirty=false}:{onDirty:(dirty:boolean)=>void;dirty?:boolean}){
 const state=useAdminWorkspace(),router=useRouter();
 const [name,setName]=useState(''),[isTest,setIsTest]=useState(false),[selected,setSelected]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const teams=state.teams?.filter(t=>t.cohortId===state.selectedCohortId)??[];
 const team=teams.find(t=>t.id===selected);
 const unassigned=state.enrollments.filter(e=>e.cohortId===state.selectedCohortId&&e.participationStatus==='enrolled'&&!e.isTest&&!teams.some(t=>t.enrollmentIds.includes(e.id)));
 return <section aria-label="Teams" className="mt-12 border-t border-border pt-8"><h2 className="text-2xl font-bold">Teams</h2><p className="mt-2 text-sm text-ink-soft">Admins assign teams. Members cannot choose or change teams. {unassigned.length} official participants unassigned.</p>
  {unassigned.length?<details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Unassigned participants</summary><ul className="mt-2 space-y-1">{unassigned.map(e=><li key={e.id}>{state.people.find(p=>p.id===e.personId)?.fullName}</li>)}</ul></details>:null}
  <div className="mt-5 flex flex-wrap items-end gap-3"><label className="grow text-sm font-bold">New team name<input className={'mt-2 '+control} value={name} onChange={e=>setName(e.target.value)}/></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)}/>Test team</label><Button disabled={busy||!name.trim()||!state.selectedCohortId} onClick={async()=>{setBusy(true);try{const result=await saveTeam('create',{name,isTest,cohortId:state.selectedCohortId});setMessage(result.error??'Team created. Select it below to assign members.');if(!result.error){setName('');router.refresh();}}catch{setMessage('Could not create team. Retry.');}finally{setBusy(false);}}}>Create team</Button></div>
  {message?<p className="mt-3 text-sm" role="status">{message}</p>:null}
  <label className="mt-5 block text-sm font-bold">Manage team<select className={'mt-2 '+control} value={team?.id??''} onChange={e=>{if(dirty&&!window.confirm('Switch teams? Any unsaved team edits will be discarded.'))return;setSelected(e.target.value);}}><option value="">Choose a team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.isTest?' · Test':''} · {t.enrollmentIds.length} members</option>)}</select></label>
  {team?<TeamEditor key={team.id+':'+team.version} team={team} onDirty={onDirty}/>:null}
 </section>;
}
