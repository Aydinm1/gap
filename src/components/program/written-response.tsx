export function WrittenResponse({ text }: { text: string }) {
  return <div aria-label="Written response" className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-7 text-ink">{text}</div>;
}
