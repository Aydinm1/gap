'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AssignmentInstructionsEditor } from './assignment-instructions-editor';
import { saveCaseExercise } from '@/lib/cases/actions';
import type { CaseContent, CaseExercise } from '@/lib/cases/types';
export function CaseEditor({assignmentId,initial,template,onDirty,onSaved}:{assignmentId:string;initial:CaseExercise;template:CaseContent;onDirty:(id:string,dirty:boolean)=>void;onSaved:()=>void}) {
 const router=useRouter();
 const [saved,setSaved]=useState(initial);
 const baseline=initial.cases.length===8?{overview:initial.overview??'',closing:initial.closing??'',cases:initial.cases.map(c=>({...c,reference:c.reference??''}))}:template;
 const [content,setContent]=useState<CaseContent>(baseline);
 const [savedKey,setSavedKey]=useState(JSON.stringify(baseline));
 const [pending,startTransition]=useTransition();const [message,setMessage]=useState('');
 const request=useRef<{key:string;id:string}|null>(null);
 const dirty=JSON.stringify(content)!==savedKey;
 useEffect(()=>{onDirty('cases-'+assignmentId,dirty);return()=>onDirty('cases-'+assignmentId,false);},[onDirty,assignmentId,dirty]);
 function save(){const data={version:saved.configVersion,content};const key=JSON.stringify(data);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};const id=request.current.id;
  startTransition(async()=>{try{const r=await saveCaseExercise('configure',assignmentId,data,id);if(r.error)return setMessage(r.error);if(r.exercise){setSaved(r.exercise);setSavedKey(JSON.stringify(content));onSaved();setMessage('Eight-case workflow saved.');router.refresh();}}catch{setMessage('Save could not be confirmed. Your edits are retained; retry.');}});
 }
 return <section className="grid gap-5"><p className="text-sm text-ink-soft">Individual practice: save each case to reveal its reference, then Finish challenge automatically completes the assignment. Answers stay editable until finishing. Configure while the week is a draft; content locks after the first participant save.</p>
 <AssignmentInstructionsEditor label="Challenge overview" value={content.overview} format="markdown" showFormat={false} onChange={p=>setContent({...content,overview:p.instructions??content.overview})}/>
 {content.cases.map((c,i)=><details key={c.number} className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-bold">Case {c.number} · {c.title}</summary><div className="mt-4 grid gap-4"><label className="font-semibold">Title<input className="mt-2 min-h-11 w-full rounded-lg border border-border p-3" value={c.title} maxLength={300} onChange={e=>setContent({...content,cases:content.cases.map((v,j)=>j===i?{...v,title:e.target.value}:v)})}/></label>{(['scenario','reference'] as const).map(field=><AssignmentInstructionsEditor key={field} label={field==='scenario'?'Case scenario':'Reference approach — revealed only after saving'} value={c[field]} format="markdown" showFormat={false} onChange={p=>setContent({...content,cases:content.cases.map((v,j)=>j===i?{...v,[field]:p.instructions??v[field]}:v)})}/>)}</div></details>)}
 <AssignmentInstructionsEditor label="Closing reflection" value={content.closing} format="markdown" showFormat={false} onChange={p=>setContent({...content,closing:p.instructions??content.closing})}/>
 <Button disabled={pending||(!dirty&&saved.workflow==='cases')} onClick={save}>{pending?'Saving…':'Save eight-case workflow'}</Button>{message?<p role="status" className="text-sm font-semibold">{message}</p>:null}</section>;
}
