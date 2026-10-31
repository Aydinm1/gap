'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SubmissionEditor } from './submission-editor';
export function PracticeSubmission({ assignmentId, documentsOnly=false }: { assignmentId:string; documentsOnly?:boolean }) {
  const [open,setOpen]=useState(false);
  return <section aria-label="Practice submission"><h2 className="text-xl font-bold">Submission preview</h2><p className="mt-3 text-sm leading-6 text-ink-soft">Practice only — nothing is saved. Leaving resets your input.</p>{open ? <div className="mt-5"><SubmissionEditor preview documentsOnly={documentsOnly} assignmentId={assignmentId} layout="wide" actionLabel="Submit assignment" description="Try selecting a file or entering a link. Saving is disabled." onCancel={()=>setOpen(false)} onSubmit={async()=>{throw new Error('Practice only — saving is disabled.');}} /></div> : <Button className="mt-5" onClick={()=>setOpen(true)}>Try submission preview</Button>}</section>;
}
