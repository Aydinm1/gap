import type { ReactNode } from "react";
import { Card } from "./card";

export function StateMessage({
  title,
  children,
  action,
  tone = "empty",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "empty" | "error";
}) {
  return (
    <Card className="p-6 sm:p-8" role={tone === "error" ? "alert" : "status"}>
      <div className={tone === "error" ? "border-l-4 border-danger-text pl-5" : "border-l-4 border-brand pl-5"}>
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <div className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{children}</div>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </Card>
  );
}
