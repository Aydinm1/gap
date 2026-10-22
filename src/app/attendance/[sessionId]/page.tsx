import { MemberCheckIn } from '@/components/attendance/member-check-in';
import { readAttendanceMember } from '@/lib/attendance/data';
export const metadata = { title: 'Workshop check-in | GAP', robots: { index: false, follow: false } };
export default async function AttendancePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const data = await readAttendanceMember(sessionId);
  const version = 'receipt' in data ? data.receipt?.updated_at : undefined;
  return <MemberCheckIn key={`${sessionId}:${version ?? 'not-recorded'}`} sessionId={sessionId} {...data} />;
}
