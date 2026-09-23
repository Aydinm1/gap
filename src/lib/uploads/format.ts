export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const FILE_MIMES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;
export function fileMime(name: string): string | undefined {
  const extension = name.split('.').pop()?.toLowerCase();
  return FILE_MIMES[extension as keyof typeof FILE_MIMES];
}
export function fileError(file: unknown) {
  if (!file || typeof file !== 'object' || !('name' in file) || typeof file.name !== 'string'
    || !('size' in file) || typeof file.size !== 'number' || !('type' in file) || typeof file.type !== 'string') return 'Choose a valid file.';
  if (!file.name.trim() || file.name.length > 240 || /[\x00-\x1f\x7f/\\]/.test(file.name)) return 'Use a filename without slashes or control characters (up to 240 characters).';
  const mime = fileMime(file.name);
  if (!mime || (file.type && file.type !== mime)) return 'Choose a PDF, DOCX, PPTX, or XLSX with a matching file type.';
  if (!Number.isSafeInteger(file.size) || file.size < 1) return 'Choose a nonempty file.';
  if (file.size > MAX_FILE_BYTES) return 'File must be 20 MB or smaller.';
}
export type UploadIntent = { id: string; state: 'pending'; path: string; name: string; size: number; mime: string; expiresAt: string };
export type UploadReceipt = { id: string; state: 'committed'; submissionId: string };
export type UploadResult = UploadIntent | UploadReceipt | { error: string };
