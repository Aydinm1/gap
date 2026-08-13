"use client";

import { useState } from "react";

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadPreview() {
  const [file, setFile] = useState<{ name: string; size: number }>();

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink" htmlFor="submission-file">
        Upload file
      </label>
      <label
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-subtle px-5 py-6 text-center transition-colors hover:border-action hover:bg-success-bg"
        htmlFor="submission-file"
      >
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-surface text-xl text-action shadow-card">
          ↑
        </span>
        <span className="mt-3 text-sm font-bold text-ink">
          {file ? file.name : "Choose a file"}
        </span>
        <span className="mt-1 text-xs leading-5 text-ink-soft">
          {file ? `${formatFileSize(file.size)} · Ready to submit` : "PDF, DOCX, PPTX, or XLSX · up to 20 MB"}
        </span>
      </label>
      <input
        id="submission-file"
        type="file"
        accept=".pdf,.docx,.pptx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          setFile(selected ? { name: selected.name, size: selected.size } : undefined);
        }}
      />
    </div>
  );
}
