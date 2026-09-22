import type { MondayRow } from './reader';
export type ImportRow = MondayRow & { eligibility: 'ready' | 'needs_link' | 'already_linked' | 'blocked'; reason: string | null;
  result?: { status: string; message: string } | null };
export type ImportBatch = { id: string; account: string; board: string; expiresAt: string; mappings: Record<string,string>; rows: ImportRow[] };
