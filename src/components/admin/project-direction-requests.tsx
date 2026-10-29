'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { saveGuidedProjectSafely as saveGuidedProject } from '@/lib/guided/client';
import type { GuidedProject, GuidedTeam } from '@/lib/guided/types';
import { useAdminWorkspace } from './admin-workspace';

export type ProjectInboxEntry={assignmentId:string;weekId:string;cohortId:string;title:string;project:GuidedProject};
function TeamRequest({entry,team}:{entry:ProjectInboxEntry;team:GuidedTeam}) {
 const router=useRouter();
 const [note,setNote]=useState('');
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const request=useRef<{key:string;id:string}|undefined>(undefined);
 const q=team.requests.find(q=>q.status==='pending');
 function decide(decision:'approved'|'changes_requested'){
  if(!q||!team.state)return;
  const data={version:team.state.version,teamId:team.id,requestId:q.id,decision,note};const key=JSON.stringify(data);
  if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  startTransition(async()=>{const r=await saveGuidedProject('decide',entry.assignmentId,data,id);if(r.error)return setMessage(r.error);setMessage('Decision saved.');router.refresh();});
 }
 return <article className="border-t border-border py-5"><h3 className="font-bold">{team.name}{team.isTest?' · Test':''} · {entry.title}</h3><p className="mt-2 text-sm text-ink-soft">{q?'Pending approval':team.state?.direction==='recommended'?'Recommended direction':team.requests[0]?.status.replaceAll('_',' ')??'Research saved'}</p>
 <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Research and direction history</summary><div className="mt-3 space-y-5 text-sm">{team.recommendation?<div><p className="font-bold">{team.recommendation.company} · {team.recommendation.title}</p><AssignmentBrief instructions={team.recommendation.guidance} format="markdown"/></div>:null}{team.state?([['Original research',team.state.original_research],['Current research',team.state.research]] as const).map(([label,research])=><div key={label}><h4 className="font-bold">{label}</h4>{research?Object.entries(research).map(([k,v])=><p key={k} className="mt-2 whitespace-pre-wrap"><strong>{k==='risk1'?'Risk 1':k==='risk2'?'Risk 2':'Initial question'}: </strong>{v}</p>):null}</div>):null}{team.requests.map(r=><div key={r.id} className="rounded-lg border border-border p-4"><p className="font-bold">{r.status.replaceAll('_',' ')}{r.decision?` · Decision: ${r.decision.replaceAll('_',' ')}`:''}</p>{Object.entries(r.proposal).map(([k,v])=><p key={k} className="mt-2 whitespace-pre-wrap"><strong>{k}: </strong>{v}</p>)}{r.decision_note?<p className="mt-3 whitespace-pre-wrap">Admin note: {r.decision_note}</p>:null}</div>)}</div></details>
 {q?<><div className="my-4 space-y-3 text-sm">{Object.entries(q.proposal).map(([key,value])=><p key={key} className="whitespace-pre-wrap"><strong>{key}: </strong>{value}</p>)}</div><label className="block text-sm font-bold">Decision note<textarea className="mt-2 w-full rounded-lg border border-border p-3 font-normal" rows={3} maxLength={50000} value={note} disabled={pending} onChange={e=>setNote(e.target.value)}/></label><div className="mt-4 flex flex-wrap gap-3"><Button disabled={pending||team.state?.frozen} onClick={()=>decide('approved')}>Approve direction</Button><Button variant="secondary" disabled={pending||!note.trim()||team.state?.frozen} onClick={()=>decide('changes_requested')}>Request changes</Button></div></>:null}
 {message?<p role="status" className="mt-3 text-sm">{message}</p>:null}</article>;
}
export function ProjectDirectionRequests({entries}:{entries:ProjectInboxEntry[]}) {
 const workspace=useAdminWorkspace(),params=useSearchParams();
 const filtered=entries.filter(e=>e.cohortId===workspace.selectedCohortId&&(!params.get('week')||e.weekId===params.get('week'))&&(!params.get('assignment')||e.assignmentId===params.get('assignment')));
 if(!filtered.length)return null;
 const test=params.get('audience')==='test';
 return <section className="mt-8 rounded-card border border-border bg-surface p-5 sm:p-7" aria-label="Project direction requests"><h2 className="text-xl font-bold">Project direction requests</h2><p className="mt-2 text-sm text-ink-soft">Preparation approvals are separate from graded submissions. {test?'Test teams only.':'Official teams only.'}</p>{filtered.some(e=>e.project.teams?.some(t=>t.isTest===test&&t.state))?filtered.flatMap(entry=>(entry.project.teams??[]).filter(t=>t.isTest===test&&t.state).map(team=><TeamRequest key={entry.assignmentId+team.id+team.state?.version} entry={entry} team={team}/>)):<p className="mt-5 text-sm text-ink-soft">No team research or direction requests in this scope yet.</p>}</section>;
}
