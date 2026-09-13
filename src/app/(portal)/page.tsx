import type { Metadata } from "next";
import { MemberDashboard } from "@/components/program/member-dashboard";
import { MOCK_NOW, mockCohorts, mockEnrollments, mockSubmissions, mockUsers, mockWeeks } from "@/lib/program/mock-data";
export const metadata: Metadata = { title: "Program | GAP" };
export default function DashboardPage() {
  return <MemberDashboard input={{ user: mockUsers.member, cohort: mockCohorts.fall2026, enrollment: mockEnrollments[0], weeks: mockWeeks, submissions: mockSubmissions.filter((attempt) => attempt.enrollmentId === mockEnrollments[0].id), now: MOCK_NOW.toISOString() }} />;
}
