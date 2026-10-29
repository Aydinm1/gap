'use client';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentBrief } from './assignment-brief';
import { saveGuidedProjectSafely as saveGuidedProject } from '@/lib/guided/client';
import { canSubmitGuided, type GuidedProject, type GuidedAction, type Research, type Proposal } from '@/lib/guided/types';

const input='mt-2 w-full min-h-28 rounded-lg border border-border-strong bg-surface p-3 text-base font-normal';
const emptyResearch:Research={risk1:'',risk2:'',question:''};
const emptyProposal:Proposal={risk:'',direction:'',question:'',evidence:''};

export function GuidedProjectFlow({assignmentId,initial,preview=false,children}:{assignmentId:string;initial:GuidedProject;preview?:boolean;children:ReactNode}) {
 const router=useRouter();
 const [step,setStep]=useState(initial.state?.direction?3:initial.state?2:1);
 const [research,setResearch]=useState(initial.state?.research??emptyResearch);
 const latest=initial.requests?.find(r=>r.status!=='superseded');
 const [proposal,setProposal]=useState(latest?.proposal??emptyProposal);
 const [alternative,setAlternative]=useState(false);
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const request=useRef<{key:string;id:string}|undefined>(undefined);
 const [baseline,setBaseline]=useState(JSON.stringify({research:initial.state?.research??emptyResearch,proposal:latest?.proposal??emptyProposal}));
 const dirty=JSON.stringify({research,proposal})!==baseline;
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};
  const guard=(e:MouseEvent)=>{const link=(e.target as Element).closest('a');if(dirty&&link&&!link.pathname.startsWith('/api/')&&!window.confirm('Leave your unsaved project edits?')){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',warn);document.addEventListener('click',guard,true);
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',guard,true);};
 },[dirty]);
 const frozen=initial.state?.frozen??false;
 function save(action:GuidedAction,values:Record<string,unknown>,next:number){
  if(preview)return;
  const data={...values,version:initial.state?.version??0},key=JSON.stringify({action,data});
  if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
  const id=request.current.id;
  startTransition(async()=>{
   const result=await saveGuidedProject(action,assignmentId,data,id);
   if(result.error)return setMessage(result.error);
   setBaseline(current=>{const saved=JSON.parse(current);if(action==='research')saved.research=research;if(action==='alternative')saved.proposal=proposal;return JSON.stringify(saved);});setMessage('Team work saved.');setStep(next);setAlternative(false);router.refresh();
  });
 }
 const config=initial.config;
 if(!config)return <p className="py-6 text-sm text-ink-soft">Your project guide is being prepared.</p>;
 return <section aria-label="Guided project" className="py-8">
  <details className="border-b border-border pb-6" open={!initial.state}><summary className="min-h-11 cursor-pointer font-bold">How this assignment works</summary><div className="mt-5"><AssignmentBrief instructions={config.overview} format="markdown"/></div></details>
  {preview?<p className="mt-5 rounded-lg bg-surface-subtle p-4 text-sm font-semibold">Read-only preview — nothing is saved or submitted.</p>:null}
  <nav aria-label="Project steps" className="my-6 grid grid-cols-3 gap-2">{['Research','Direction','Final document'].map((label,index)=><button key={label} type="button" aria-current={step===index+1?'step':undefined} onClick={()=>{setStep(index+1);setMessage('');}} className={'min-h-14 rounded-lg border px-2 py-3 text-sm font-semibold '+(step===index+1?'border-action bg-action text-white':'border-border text-ink-soft')}><span className="block text-xs">Step {index+1}</span>{label}<span className="mt-1 block text-xs font-normal">{index===0?(initial.state?'Saved':'Not saved'):index===1?(initial.state?.direction==='recommended'?'Selected':latest?.status==='approved'?'Approved':latest?.status==='pending'?'Pending approval':latest?.status==='changes_requested'?'Changes requested':'Not selected'):(frozen?'Submitted':'Not submitted')}</span></button>)}</nav>
  {frozen?<p className="mb-5 text-sm text-ink-soft">Research and direction are frozen after your team’s first final submission. You can still replace actionable submitted work.</p>:null}
  {step===1?<section><h2 className="text-xl font-bold">Discover a strategic challenge</h2><p className="mt-4 leading-7 text-ink-soft">Review your company’s 10-K, focusing on Item 1A (Risk Factors), with Item 1 (Business) and Item 7 (MD&A) for context. Identify two risks that could meaningfully affect growth or performance.</p><div className="mt-6 grid gap-5">{(['risk1','risk2','question'] as const).map((field,i)=><label key={field} className="text-sm font-bold">{i<2?`Risk #${i+1}, heading and page reference`:'Initial consulting question'}<textarea aria-label={i<2?`Risk #${i+1}, heading and page reference`:"Initial consulting question"} className={input} maxLength={10000} disabled={frozen||pending} value={research[field]} onChange={e=>setResearch({...research,[field]:e.target.value})}/></label>)}</div><p className="mt-4 text-xs leading-6 text-ink-soft">Shared with your team. Your first completed response is retained for admins; later edits do not replace that original.</p><Button className="mt-5" disabled={preview||frozen||pending||!initial.teamId||Object.values(research).some(s=>!s.trim())} onClick={()=>save('research',{research},2)}>{pending?'Saving…':initial.state?'Save research':'Save research & reveal direction'}</Button>{!preview&&!initial.teamId?<p className="mt-3 text-sm">Ask your GAP lead to assign your team before saving.</p>:null}</section>:null}
  {step===2?<section><h2 className="text-xl font-bold">Choose your project direction</h2>{!initial.state&&!preview?<p className="mt-5 text-ink-soft">Save your shared research in Step 1 to reveal your team’s recommendation.</p>:<><div className="mt-6"><AssignmentBrief instructions={config.direction_intro} format="markdown"/></div>{initial.recommendation?<div className="my-6 rounded-card border border-border bg-surface-subtle p-5"><p className="text-sm font-semibold text-ink-soft">{initial.recommendation.company} · Your recommended direction</p><h3 className="mt-2 text-lg font-bold">{initial.recommendation.title}</h3><div className="mt-4"><AssignmentBrief instructions={initial.recommendation.guidance} format="markdown"/></div></div>:<p className="my-6 font-semibold">{preview?'Select a sample team to inspect its configured recommendation.':'Your project direction is being prepared.'}</p>}
   {latest?<div className="my-5 rounded-lg border border-border p-4"><p className="font-semibold">Alternative: {latest.status==='changes_requested'?'Changes requested':latest.status==='approved'?'Approved':'Pending approval'}</p>{latest.decision_note?<p className="mt-2 whitespace-pre-wrap text-sm">{latest.decision_note}</p>:null}<details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer">View proposed direction</summary><p className="whitespace-pre-wrap">{latest.proposal.direction}</p><p className="mt-2 whitespace-pre-wrap">{latest.proposal.question}</p></details></div>:null}
   {initial.state?.direction==='recommended'?<p className="mb-4 text-sm font-semibold text-success-text">Recommended direction selected</p>:null}
   <div className="flex flex-wrap gap-3"><Button disabled={preview||pending||frozen||!initial.recommendation} onClick={()=>{if(dirty&&!window.confirm('Continue without saving your edited research/proposal?'))return;save('recommended',{},3);}}>Continue with recommended direction</Button><Button variant="secondary" disabled={frozen||pending||!initial.recommendation} onClick={()=>setAlternative(v=>!v)}>{latest?'Revise alternative request':'Request an alternative'}</Button></div>
   {alternative?<div className="mt-6 grid gap-5">{(['risk','direction','question','evidence'] as const).map((field,i)=><label key={field} className="text-sm font-bold">{['Relevant risk and citation','Proposed direction','Focused consulting question','Investigation and accessible evidence plan'][i]}<textarea aria-label={["Relevant risk and citation","Proposed direction","Focused consulting question","Investigation and accessible evidence plan"][i]} className={input} maxLength={10000} value={proposal[field]} disabled={pending} onChange={e=>setProposal({...proposal,[field]:e.target.value})}/></label>)}<p className="text-sm text-ink-soft">Changing an approved proposal requires fresh approval. You may prepare your document while waiting, but cannot submit it.</p><Button disabled={preview||pending||Object.values(proposal).some(v=>!v.trim())} onClick={()=>save('alternative',{proposal},2)}>Send for approval</Button></div>:null}</>}</section>:null}
  {step===3?<section><h2 className="mb-6 text-xl font-bold">Build your consulting problem</h2><AssignmentBrief instructions={config.final_brief} format="markdown"/><div className="mt-8 border-t border-border pt-6">{preview||canSubmitGuided(initial)?children:<p className="rounded-lg bg-surface-subtle p-5 text-sm leading-6">You can prepare your document now. Final submission opens after you save research and select the recommended direction, or an admin approves your alternative. {latest?.status==='pending'?'Your alternative is awaiting approval.':''}</p>}</div></section>:null}
  {message?<p role="status" className="mt-5 text-sm font-semibold">{message}</p>:null}
 </section>;
}
