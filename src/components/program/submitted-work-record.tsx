import type { ReactNode } from "react";
import type { SubmissionAttempt } from "@/lib/program/types";
import { submissionDisplayName } from "@/lib/program/submission";
import { formatSubmissionTime } from "@/lib/program/state";
import { cn } from "@/lib/ui";

export function SubmittedWorkRecord({
  attempt,
  children,
  density = "default",
}: {
  attempt: SubmissionAttempt;
  children: ReactNode;
  density?: "compact" | "default";
}) {
  return (
    <div className={cn(
      density === "compact" ? "" : "rounded-card border border-border bg-surface shadow-card p-6 sm:p-7",
    )}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">Submitted work</p>
      <p className={cn(
        "break-words font-bold text-ink",
        density === "compact" ? "mt-3 text-sm" : "mt-4 text-base",
      )}>{submissionDisplayName(attempt)}</p>
      <p className={cn(
        "text-ink-soft",
        density === "compact" ? "mt-1 text-xs leading-5" : "mt-2 text-sm leading-6",
      )}>Submitted {formatSubmissionTime(attempt.submittedAt)}</p>
      <div className={cn("grid gap-3", density === "compact" ? "mt-5" : "mt-6")}>
        {children}
      </div>
    </div>
  );
}
