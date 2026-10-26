'use client';
import { createClient } from '@/lib/supabase/client';
import { prepareExample, finalizeExample, cancelExample } from './actions';
import type { ExampleDocument } from './types';

export function exampleUploadTask(file: File, assignmentId: string, version: number, onProgress: (n: number) => void) {
  let intent: ExampleDocument | undefined;
  let transfer: import('tus-js-client').Upload | undefined;
  let transferred = false, canceled = false;
  let rejectTransfer: ((error: Error) => void) | undefined;
  return {
    async run() {
      if (canceled) throw new Error('Upload canceled. Select the PDF again.');
      if (!intent) {
        const r = await prepareExample(assignmentId, { name: file.name, size: file.size, type: file.type }, version);
        if ('error' in r) throw new Error(r.error);
        intent = r.document;
      }
      if (canceled) { await cancelExample(intent.id); throw new Error('Upload canceled.'); }
      if (!transferred) {
        const { Upload } = await import('tus-js-client');
        const db = createClient(), endpoint = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
        if (endpoint.hostname.endsWith('.supabase.co')) endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co');
        await new Promise<void>((resolve, reject) => {
          rejectTransfer = reject;
          const options: import('tus-js-client').UploadOptions = {
            endpoint: `${endpoint.origin}/storage/v1/upload/resumable`, chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 1000, 3000, 5000], storeFingerprintForResuming: false, uploadDataDuringCreation: true,
            metadata: { bucketName: 'grading-examples', objectName: intent!.path, contentType: 'application/pdf', cacheControl: '0' },
            onBeforeRequest: async request => {
              if (canceled) throw new Error('Canceled');
              const { data: { session } } = await db.auth.getSession();
              if (!session) throw new Error('Sign in again and reselect the PDF.');
              request.setHeader('Authorization', `Bearer ${session.access_token}`); request.setHeader('x-upsert', 'false');
            },
            onShouldRetry: (error, attempt, options) => {
              const status = error.originalResponse?.getStatus();
              return !canceled && (!status || status === 429 || status >= 500) && attempt < (options.retryDelays?.length ?? 0);
            },
            onProgress: (sent, total) => onProgress(Math.round(sent / total * 100)),
            onSuccess: () => { transferred = true; resolve(); },
            onError: () => reject(new Error('Transfer interrupted. Retry to resume, or cancel. Your PDF is still selected.')),
          };
          if (transfer) transfer.options = { ...transfer.options, ...options };
          else transfer = new Upload(file, options);
          transfer.start();
        });
      }
      if (canceled) throw new Error('Upload canceled.');
      const result = await finalizeExample(intent.id);
      if ('error' in result) throw new Error(result.error);
      return result.document;
    },
    async cancel() {
      canceled = true;
      try { await transfer?.abort(); return intent ? await cancelExample(intent.id) : {}; }
      catch { return { error: 'Cancellation could not be confirmed. Retry cancellation; unfinished uploads expire after one hour.' }; }
      finally { rejectTransfer?.(new Error('Upload stopped.')); }
    },
  };
}
