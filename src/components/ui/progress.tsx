export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = (safeValue / safeMax) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-ink-soft">{safeValue} / {safeMax}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-subtle"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
