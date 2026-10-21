'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { prepareBrief, finalizeBrief, cancelBrief } from '@/lib/assignment-briefs/actions';
import type { Assignment } from '@/lib/program/types';

export function AssignmentBriefUpload({ assignment }: { assignment: Assignment }) {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [hasIntent, setHasIntent] = useState(false);
  const [document, setDocument] = useState(assignment.document);
  const intent = useRef<string | undefined>(undefined);
  const transferred = useRef(false);
  const transfer = useRef<import('tus-js-client').Upload | undefined>(undefined);
  const locked = useRef(false);
  const saved = /^[0-9a-f-]{36}$/i.test(assignment.id);

  async function upload() {
    if (!file || locked.current) return;
    locked.current = true; setBusy(true); setMessage('');
    try {
      if (!intent.current) {
        const result = await prepareBrief(assignment.id, { name: file.name, size: file.size, type: file.type }, document?.id);
        if ('error' in result) throw new Error(result.error);
        intent.current = result.document.id;
        setHasIntent(true);
        const pending = result.document;
        const { Upload } = await import('tus-js-client');
        const db = createClient();
        const endpoint = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
        if (endpoint.hostname.endsWith('.supabase.co')) endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co');
        transfer.current = new Upload(file, {
          endpoint: `${endpoint.origin}/storage/v1/upload/resumable`, chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000], uploadDataDuringCreation: true, storeFingerprintForResuming: false,
          metadata: { bucketName: 'assignment-briefs', objectName: pending.path, contentType: 'application/pdf', cacheControl: '0' },
          onBeforeRequest: async request => {
            const { data: { session } } = await db.auth.getSession();
            if (!session) throw new Error('Sign in again and reselect the PDF.');
            request.setHeader('Authorization', `Bearer ${session.access_token}`);
            request.setHeader('x-upsert', 'false');
          },
          onShouldRetry: (error, attempt, options) => {
            const status = error.originalResponse?.getStatus();
            return (!status || status === 429 || status >= 500) && attempt < (options.retryDelays?.length ?? 0);
          },
          onProgress: (sent, total) => setProgress(Math.round(sent / total * 100)),
        });
      }
      if (!transferred.current) {
        if (!transfer.current) throw new Error('Cancel this upload and select the PDF again.');
        await new Promise<void>((resolve, reject) => {
          transfer.current!.options.onSuccess = () => { transferred.current = true; resolve(); };
          transfer.current!.options.onError = () => reject(new Error('Transfer interrupted. Retry upload, or cancel and start again.'));
          transfer.current!.start();
        });
      }
      setMessage('Checking and attaching PDF…');
      const result = await finalizeBrief(intent.current!);
      if ('error' in result) throw new Error(result.error);
      setDocument({ id: result.document.id, name: result.document.original_filename });
      intent.current = undefined; transfer.current = undefined; transferred.current = false;
      setHasIntent(false);
      setFile(undefined); setProgress(0); setMessage('Assignment PDF attached.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed. Please retry.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function cancel() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      await transfer.current?.abort();
      const result = intent.current ? await cancelBrief(intent.current) : {};
      if (result.error) { setMessage(result.error); return; }
      intent.current = undefined; transfer.current = undefined; transferred.current = false;
      setHasIntent(false);
      setFile(undefined); setProgress(0); setMessage('Upload canceled.');
    } catch { setMessage('Could not cancel. Please retry.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="rounded-lg border border-border bg-surface-subtle p-5" aria-label="Assignment PDF">
    <h3 className="text-sm font-bold">Assignment PDF</h3>
    <p className="mt-2 text-sm leading-6 text-ink-soft">Attach the assignment brief as a PDF, up to 20 MB. Uploading saves it immediately; members can download it when this week is published.</p>
    {document ? <a className="mt-3 inline-flex min-h-11 items-center break-all text-sm font-bold text-action underline" href={`/api/assignment-briefs/${document.id}/download`}>Download {document.name}</a> : null}
    {saved ? <div className="mt-4 space-y-3">
      <label className="block text-sm font-bold">Choose PDF<input key={document?.id ?? 'new'} className="mt-2 block w-full text-sm" type="file" accept="application/pdf,.pdf" disabled={busy || hasIntent} onChange={event => { setFile(event.target.files?.[0]); setMessage(''); }} /></label>
      {file ? <p className="break-all text-sm text-ink-soft">Selected: {file.name}</p> : null}
      {busy ? <div><progress className="w-full accent-action" value={progress} max={100} aria-label="PDF upload progress" /><p className="text-sm text-ink-soft">{progress < 100 ? `Uploading… ${progress}%` : 'Checking and attaching PDF…'}</p></div> : null}
      <div className="flex flex-wrap gap-3"><Button size="compact" disabled={!file || busy} onClick={upload}>{busy ? 'Saving PDF…' : hasIntent ? 'Retry upload / save' : document ? 'Replace PDF' : 'Upload PDF'}</Button>{file ? <Button size="compact" variant="secondary" disabled={busy} onClick={cancel}>Cancel upload</Button> : null}</div>
      <p className="text-xs leading-5 text-ink-faint">Keep this page open until saving finishes. After a reload, select the file again.</p>
    </div> : <p className="mt-3 text-sm text-ink-soft">Save the assignment draft first, then attach its PDF.</p>}
    {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
  </section>;
}
