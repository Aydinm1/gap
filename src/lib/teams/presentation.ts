import type { CohortTeam } from '../program/types';

export function nextTeamName(teams: Pick<CohortTeam, 'name'>[]): string {
  let highest = 0;
  for (const team of teams) {
    const match = /^Team (\d+)$/i.exec(team.name.trim());
    if (match && Number.isSafeInteger(Number(match[1]))) highest = Math.max(highest, Number(match[1]));
  }
  return `Team ${highest + 1}`;
}

export function defaultTeam(teams: CohortTeam[]): CohortTeam | undefined {
  return teams.find(team => !team.isTest) ?? teams[0];
}
