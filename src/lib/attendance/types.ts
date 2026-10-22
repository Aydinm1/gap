export type AttendanceSession = {
  id: string; week_id: string; workshop_date: string; opened_at: string;
  closes_at: string; closed_at: string | null; updated_at: string;
};
export type AttendanceRecord = {
  id: string; session_id: string; enrollment_id: string; present: boolean;
  recorded_at: string | null; updated_at: string;
};
export type AttendanceHistory = {
  id: string; session_id: string; enrollment_id: string; actor_id: string;
  present: boolean; source: 'member' | 'admin'; changed_at: string; actor_name?: string;
};
export type AttendanceAdminData = {
  sessions: (AttendanceSession & { code: string; qr?: string })[];
  records: AttendanceRecord[]; history: AttendanceHistory[]; now: string;
};
export type AttendancePrompt = { id: string; weekNumber: number; title: string };
export type AttendanceOperation =
  | { action: 'open'; weekId: string; workshopDate: string }
  | { action: 'close'; sessionId: string }
  | { action: 'correct'; sessionId: string; enrollmentId: string; present: boolean; expectedUpdatedAt: string | null }
  | { action: 'check_in'; sessionId: string; code: string };
export type AttendanceResult = { error?: string; receipt?: AttendanceRecord };
export function isCheckInOpen(session: AttendanceSession, now: string | number) {
  return !session.closed_at && Date.parse(session.closes_at) > (typeof now === 'number' ? now : Date.parse(now));
}
export function normalizeAttendanceCode(value: string) { return value.toUpperCase().replace(/[\s-]/g, ''); }
export function attendanceTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
