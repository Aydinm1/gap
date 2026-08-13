import type { ProgramWeek, PublishedWeek } from "./types.ts";
import { isPublishedWeek } from "./types.ts";

export function findPublishedWeek(
  weeks: readonly ProgramWeek[],
  weekNumber: string,
): PublishedWeek | undefined {
  if (!/^[1-6]$/.test(weekNumber)) return undefined;
  const number = Number(weekNumber);
  return weeks.find(
    (week): week is PublishedWeek =>
      week.weekNumber === number && isPublishedWeek(week),
  );
}
