import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-subtle text-ink-soft",
  info: "bg-info-bg text-info-text",
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  danger: "bg-danger-bg text-danger-text",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
