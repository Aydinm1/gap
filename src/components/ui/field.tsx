import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function Field({ id, label, hint, error, className, ...props }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cn(
          "min-h-11 w-full rounded-lg border bg-surface px-3.5 text-base text-ink placeholder:text-ink-faint",
          error ? "border-danger-text" : "border-border-strong",
          className,
        )}
        {...props}
      />
      {hint ? <p id={hintId} className="mt-2 text-sm text-ink-soft">{hint}</p> : null}
      {error ? <p id={errorId} className="mt-2 text-sm font-semibold text-danger-text">{error}</p> : null}
    </div>
  );
}
