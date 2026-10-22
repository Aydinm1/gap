import type { ProgramCohort } from './types.ts';
import { compareCohorts } from './state.ts';
export function selectExploreCohort(cohorts: readonly ProgramCohort[], requestedId?: string) {
  const ordered=cohorts.filter(c=>c.state==='active'||c.state==='archived').toSorted(compareCohorts).reverse();
  return requestedId ? ordered.find(c=>c.id===requestedId) : ordered.find(c=>c.state==='active') ?? ordered[0];
}
