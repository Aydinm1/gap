'use client';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { AssignmentBrief } from '@/components/program/assignment-brief';
import { safeBriefUrl, MAX_BRIEF_CHARACTERS, type BriefFormat } from '@/lib/program/brief';

export function AssignmentInstructionsEditor({ value, format = 'plain', onChange }: {
  value: string; format?: BriefFormat; onChange: (patch: { instructions?: string; instructionsFormat?: BriefFormat }) => void;
}) {
  const id = useId(), textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    if (!selection.current || !textarea.current) return;
    textarea.current.focus(); textarea.current.setSelectionRange(...selection.current);
    selection.current = null;
  }, [value]);
  const [error, setError] = useState('');
  const button = 'min-h-11 rounded-md border border-border px-3 text-sm font-bold text-ink hover:bg-surface-subtle';
  function apply(kind: 'heading' | 'bold' | 'bullets' | 'numbers' | 'link') {
    const node = textarea.current; if (!node) return;
    const start = node.selectionStart, end = node.selectionEnd;
    const selected = value.slice(start, end);
    let insert = '';
    if (kind === 'bold') insert = `**${selected || 'Bold text'}**`;
    else if (kind === 'link') {
      const url = window.prompt('Web address (https://...)'); if (url === null) return;
      const safe = safeBriefUrl(url.trim());
      if (!safe || /[)\s]/.test(safe) || /[\[\]\n]/.test(selected)) return setError('Use a valid HTTP or HTTPS link with a simple text label.');
      insert = `[${selected || 'Link text'}](${safe})`;
    } else {
      const lines = (selected || (kind === 'heading' ? 'Section heading' : 'List item')).split('\n');
      insert = (start > 0 && value[start - 1] !== '\n' ? '\n' : '')
        + lines.map((line, index) => `${kind === 'heading' ? '## ' : kind === 'bullets' ? '- ' : `${index + 1}. `}${line}`).join('\n')
        + (end < value.length && value[end] !== '\n' ? '\n' : '');
    }
    selection.current = [start, start + insert.length];
    onChange({ instructions: value.slice(0, start) + insert + value.slice(end), instructionsFormat: 'markdown' });
    setError('');
  }
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-bold">Instructions</label>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">Format<select aria-label="Instruction format" className="min-h-11 rounded-md border border-border bg-surface px-2 text-sm" value={format} onChange={e => onChange({ instructionsFormat: e.target.value as BriefFormat })}><option value="plain">Plain text</option><option value="markdown">Formatted</option></select></label></div>
    <div role="group" aria-label="Instruction formatting" className="mt-2 flex flex-wrap gap-2">{(['heading','bold','bullets','numbers','link'] as const).map(kind => <button key={kind} type="button" className={button} onClick={() => apply(kind)}>{({heading:'Heading',bold:'Bold',bullets:'Bulleted list',numbers:'Numbered list',link:'Link'})[kind]}</button>)}</div>
    <textarea ref={textarea} id={id} rows={10} value={value} onChange={e => onChange({instructions:e.target.value})} aria-describedby={`${id}-help`} className="mt-3 block w-full rounded-lg border border-border-strong bg-surface p-3.5 text-base leading-7" />
    <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-ink-soft">Select text, then use the toolbar. Formatting uses ## headings, **bold**, lists and [links](https://...). No HTML, images or embeds. Up to {MAX_BRIEF_CHARACTERS.toLocaleString('en-US')} characters.</p>
    {error ? <p role="alert" className="mt-2 text-sm text-danger-text">{error}</p> : null}
    <details className="mt-4 rounded-lg border border-border bg-surface-subtle p-4"><summary className="cursor-pointer text-sm font-bold">Preview instructions</summary><div className="mt-5"><AssignmentBrief instructions={value} format={format} /></div></details>
  </div>;
}
