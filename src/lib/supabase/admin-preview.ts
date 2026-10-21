import 'server-only';
import { readWorkspace } from './data';
import { buildAdminPreview } from '@/lib/program/admin-preview';

export async function readAdminPreview(cohortId?: string) {
  // Authorization repeats at the data boundary even when the admin layout is reused.
  const { user, state } = await readWorkspace(true);
  return buildAdminPreview(state, user, cohortId);
}
