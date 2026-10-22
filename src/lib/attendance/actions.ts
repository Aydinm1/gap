'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { AttendanceOperation, AttendanceRecord, AttendanceResult } from './types';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function saveAttendance(input: AttendanceOperation): Promise<AttendanceResult> {
  const action = input?.action;
  await requireUser(action !== 'check_in');
  if (!input || typeof input !== 'object' || !['open', 'close', 'correct', 'check_in'].includes(action)) return { error: 'Invalid attendance request.' };
  if (action === 'open') {
    if (!uuid(input.weekId) || typeof input.workshopDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.workshopDate) || !Number.isFinite(Date.parse(input.workshopDate)) || new Date(input.workshopDate).toISOString().slice(0,10) !== input.workshopDate) return { error: 'Choose a valid workshop date.' };
  } else if (!uuid(input.sessionId)) return { error: 'Invalid workshop.' };
  if (action === 'check_in' && (typeof input.code !== 'string' || input.code.length > 100)) return { error: 'Enter the six-character code.' };
  if (action === 'correct' && (!uuid(input.enrollmentId) || typeof input.present !== 'boolean' || (input.expectedUpdatedAt !== null && (typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt)))))) return { error: 'Invalid correction. Refresh and try again.' };
  const { action: _, ...data } = input;
  void _;
  const db = await createClient();
  const result = await db.rpc('attendance', { p_action: action, p_data: data });
  if (result.error) return { error: result.error.code === '40001' ? 'Attendance changed. Refresh and try again.' : result.error.code === '42501' ? 'Your access or enrollment no longer permits this action.' : 'Attendance could not be saved. Check the workshop date, active cohort and published week, then retry.' };
  const value = result.data as { error?: string } & AttendanceRecord;
  if (value.error) return { error: value.error };
  revalidatePath('/', 'layout');
  return { receipt: value.id ? value : undefined };
}
