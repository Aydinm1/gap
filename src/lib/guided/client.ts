import { saveGuidedProject } from './actions';
import type { GuidedAction } from './types';

/** A lost Server Action response is recoverable with the same request receipt. */
export async function saveGuidedProjectSafely(action: GuidedAction, assignmentId: string, data: unknown, requestId: string) {
 try { return await saveGuidedProject(action,assignmentId,data,requestId); }
 catch { return {error:'Save could not be confirmed. Your input is retained. Retry without changing it to recover the saved receipt.'}; }
}
