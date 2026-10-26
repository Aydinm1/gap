export type GradingReference = {
  assignmentId: string;
  rubric: string;
  example: string;
  textVersion: number;
  fileVersion: number;
  document?: { id: string; name: string };
};
export type ExampleDocument = {
  id: string; assignment_id: string; original_filename: string; path: string;
  file_size: number; state: 'pending' | 'ready' | 'abandoned'; is_current: boolean;
};
export type ExampleResult = { document: ExampleDocument } | { error: string };
export function emptyReference(assignmentId: string): GradingReference {
  return { assignmentId, rubric: '', example: '', textVersion: 0, fileVersion: 0 };
}
export function referenceError(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return 'Invalid grading reference.';
  const value = input as Record<string, unknown>;
  if (typeof value.assignmentId !== 'string' || !isUuid(value.assignmentId)
    || typeof value.rubric !== 'string' || typeof value.example !== 'string'
    || !Number.isSafeInteger(value.textVersion) || Number(value.textVersion) < 0) return 'Invalid grading reference.';
  if (Array.from(value.rubric).length > 50000 || Array.from(value.example).length > 50000) return 'Keep each reference to 50,000 characters or fewer.';
}
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
