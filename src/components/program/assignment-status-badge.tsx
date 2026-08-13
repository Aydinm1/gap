import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AssignmentDisplayState } from "@/lib/program/types";

const presentation: Record<
  AssignmentDisplayState,
  { label: string; tone: BadgeTone; symbol: string }
> = {
  upcoming: { label: "Not submitted", tone: "neutral", symbol: "○" },
  due_soon: { label: "Due soon", tone: "warning", symbol: "◷" },
  overdue: { label: "Overdue", tone: "danger", symbol: "!" },
  submitted: { label: "Submitted", tone: "info", symbol: "↑" },
  reviewed: { label: "Reviewed", tone: "success", symbol: "✓" },
  needs_revision: { label: "Needs revision", tone: "warning", symbol: "↻" },
};

export function AssignmentStatusBadge({ state }: { state: AssignmentDisplayState }) {
  const { label, tone, symbol } = presentation[state];
  return (
    <Badge tone={tone}>
      <span aria-hidden="true" className="mr-1.5">{symbol}</span>
      {label}
    </Badge>
  );
}
