'use client';

/** In-page navigation only: panels stay mounted so drafts and transfers survive. */
export function EditorSections<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return <nav aria-label={label} className="flex flex-wrap gap-1 border-b border-border pb-2">
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value}
      onClick={() => onChange(option.value)}
      className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold ${value === option.value ? 'bg-success-bg text-action' : 'text-ink-soft hover:bg-surface-subtle hover:text-ink'}`}>
      {option.label}
    </button>)}
  </nav>;
}
