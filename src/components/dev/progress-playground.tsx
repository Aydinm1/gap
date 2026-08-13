"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";

export function ProgressPlayground() {
  const [week, setWeek] = useState(2);

  return (
    <div className="max-w-xl">
      <Progress value={week} max={6} label="Modules complete" />
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <label className="text-sm font-bold text-ink" htmlFor="program-week">
            Simulate program progress
          </label>
          <output className="text-sm font-semibold text-action" htmlFor="program-week">
            Week {week} of 6
          </output>
        </div>
        <input
          id="program-week"
          type="range"
          min={1}
          max={6}
          step={1}
          value={week}
          onChange={(event) => setWeek(Number(event.target.value))}
          className="h-11 w-full cursor-pointer accent-action"
        />
        <div className="flex justify-between text-xs font-semibold text-ink-faint" aria-hidden="true">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
        </div>
      </div>
    </div>
  );
}
