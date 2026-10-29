'use client';
import { useState, type ReactNode } from 'react';
import { GuidedProjectFlow } from '@/components/program/guided-project';
import type { GuidedProject } from '@/lib/guided/types';
export function GuidedPreview({assignmentId,project,children}:{assignmentId:string;project:GuidedProject;children:ReactNode}) {
 const [id,setId]=useState('');
 const team=project.teams?.find(t=>t.id===id);
 const selected:GuidedProject={workflow:project.workflow,config:project.config,teamId:team?.id,state:team?.state,recommendation:team?.recommendation,requests:team?.requests};
 return <><label className="mt-6 block text-sm font-bold">Sample team<select aria-label="Sample team" className="mt-2 block min-h-11 w-full rounded-lg border border-border p-3" value={id} onChange={e=>setId(e.target.value)}><option value="">Generic preview</option>{project.teams?.map(t=><option key={t.id} value={t.id}>{t.name}{t.isTest?' · Test':''}</option>)}</select></label><GuidedProjectFlow key={id} assignmentId={assignmentId} initial={selected} preview>{children}</GuidedProjectFlow></>;
}
