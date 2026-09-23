"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMemberWorkspace, type SubmissionDraft } from "./member-workspace";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/dev/file-upload-preview";
import {
  normalizeSubmissionUrl,
} from "@/lib/program/submission";
import type { SubmissionPayload } from "@/lib/program/types";
import { cn } from "@/lib/ui";
import { uploadTask } from '@/lib/uploads/client';
import { fileError } from '@/lib/uploads/format';
import { useRouter } from 'next/navigation';


export function SubmissionEditor({
  actionLabel,
  assignmentId,
  description,
  layout = "rail",
  onCancel,
  onSubmit,
  expected,
  onFileSaved,
}: {
  actionLabel: string;
  assignmentId: string;
  description: string;
  layout?: "rail" | "wide";
  onCancel?: () => void;
  onSubmit: (payload: SubmissionPayload) => void | Promise<void>;
  expected?: { id: string; updatedAt?: string };
  onFileSaved?: () => void;
}) {
  const router = useRouter();
  const task = useRef<ReturnType<typeof uploadTask> | undefined>(undefined);
  const busy = useRef(false);
  const [progress, setProgress] = useState<number>();
  const [finalizing, setFinalizing] = useState(false);
  const [hasTask, setHasTask] = useState(false);
  useEffect(() => () => { void task.current?.cancel(); }, []);
  const inputId = useId();
  const workspace = useMemberWorkspace();
  const [localDraft, setLocalDraft] = useState<SubmissionDraft>({ url: "" });
  const draft = workspace?.drafts[assignmentId] ?? localDraft;
  const { method, file, url } = draft;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  function patchDraft(patch: Partial<SubmissionDraft>) {
    if (workspace) workspace.setDrafts((items) => ({ ...items, [assignmentId]: { ...(items[assignmentId] ?? { url: "" }), ...patch } }));
    else setLocalDraft((current) => ({ ...current, ...patch }));
  }
  function clearDraft() {
    patchDraft({ method: undefined, file: undefined, url: "" });
  }
  const [saving, setSaving] = useState(false);
  async function finish(payload: SubmissionPayload) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try { await onSubmit(payload); clearDraft(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit. Your draft has been kept.'); }
    finally { busy.current = false; setSaving(false); }
  }
  async function sendFile() {
    if (!file || busy.current) return;
    const invalid = fileError(file); if (invalid) return setError(invalid);
    busy.current = true; setSaving(true); setError(undefined); setFinalizing(false);
    task.current ??= uploadTask(file, assignmentId, expected, setProgress, () => setFinalizing(true));
    const currentTask = task.current;
    setHasTask(true);
    try { await task.current.run(); task.current = undefined; setHasTask(false); clearDraft(); router.refresh(); onFileSaved?.(); }
    catch (cause) {
      // Cancellation owns its message once the task has been detached.
      if (task.current === currentTask) setError(cause instanceof Error ? cause.message : 'Could not upload. Retry or cancel.');
    }
    finally { busy.current = false; setSaving(false); setFinalizing(false); }
  }
  async function cancelTransfer() {
    const current = task.current;
    if (!current) return;
    task.current = undefined;
    setHasTask(false);
    const result = await current.cancel();
    setProgress(undefined);
    setError(result?.error ?? 'Upload canceled. Your file is still selected.');
  }
  function cancel() {
    if ((file || url.trim()) && !window.confirm("Discard this submission draft?")) return;
    clearDraft();
    onCancel?.();
  }
  
  const [error, setError] = useState<string>();

  function submit() {
    if (method === "file") {
      if (!file) return setError('Choose a file.');
      return sendFile();
    }

    if (method === "link") {
      const result = normalizeSubmissionUrl(url);
      if ("error" in result) return setError(result.error);
      return finish({ type: "link", submittedUrl: result.value });
    }

    setError("Choose file or link submission.");
  }

  return (
    <div>
      <h3 ref={heading} tabIndex={-1} className="text-lg font-bold text-ink outline-none">{actionLabel}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
      <div className={cn(
        "mt-6 grid gap-3",
        layout === "wide" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2",
      )}>
        {(["file", "link"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={saving || hasTask}
            aria-pressed={method === choice}
            onClick={() => { patchDraft({ method: choice }); setError(undefined); }}
            className={cn(
              "min-h-20 rounded-card border p-4 text-left transition-colors",
              method === choice
                ? "border-action bg-success-bg"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="block text-sm font-bold text-ink">
              {choice === "file" ? "Upload file" : "Submit link"}
            </span>
            <span className="mt-1 block text-xs leading-5 text-ink-soft">
              {choice === "file"
                ? "PDF, DOCX, PPTX, or XLSX · Up to 20 MB"
                : "Google Docs, Slides, Sheets, Canva, or another web link"}
            </span>
          </button>
        ))}
      </div>

      {method === "file" ? (
        <div className="mt-6">
          <label className="block text-sm font-bold text-ink" htmlFor={inputId}>Choose file</label>
          <input
            id={inputId}
            type="file"
            disabled={saving || hasTask}
            accept=".pdf,.docx,.pptx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-2 block min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-action file:px-3 file:py-2 file:font-bold file:text-white"
            onChange={(event) => { patchDraft({ file: event.target.files?.[0] }); setError(undefined); }}
          />
          {file ? <p className="mt-2 break-words text-sm text-ink-soft">{file.name} · {formatFileSize(file.size)}</p> : null}
          <p className="mt-2 text-xs leading-5 text-ink-soft">Files are private to you and GAP reviewers. After reloading, select your file again to start a new upload.</p>
        </div>
      ) : null}

      {method === "link" ? (
        <div className="mt-6">
          <label className="block text-sm font-bold text-ink" htmlFor={`${inputId}-url`}>Submission link</label>
          <input
            id={`${inputId}-url`}
            type="url"
            disabled={saving}
            value={url}
            onChange={(event) => { patchDraft({ url: event.target.value }); setError(undefined); }}
            placeholder="https://docs.google.com/..."
            className="mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-faint"
          />
          <p className="mt-2 text-xs leading-5 text-ink-soft">Make sure the review team has permission to open your link.</p>
        </div>
      ) : null}

      {progress !== undefined ? <div className="mt-4" role="status"><label className="text-sm" htmlFor={`${inputId}-progress`}>{finalizing ? 'Checking file and saving…' : `Uploaded ${progress}%`}</label><progress id={`${inputId}-progress`} className="mt-2 w-full accent-action" max={100} value={progress} /></div> : null}
      {error ? <p className="mt-4 text-sm font-bold text-danger-text" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={saving} onClick={submit}>{saving ? 'Submitting…' : actionLabel}</Button>
        {hasTask ? <Button disabled={finalizing} variant="quiet" onClick={() => void cancelTransfer()}>Cancel upload</Button> : null}
        {onCancel ? <Button disabled={saving} variant="quiet" onClick={cancel}>Cancel</Button> : null}
      </div>
    </div>
  );
}
