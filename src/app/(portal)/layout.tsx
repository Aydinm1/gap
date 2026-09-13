import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { mockCohorts, mockUsers, mockSubmissions, mockEnrollments } from "@/lib/program/mock-data";
import { MemberWorkspace } from "@/components/program/member-workspace";
import { formatCohortLabel } from "@/lib/program/state";

const navigation = [] as const;
const profileLinks = [] as const;

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader
        user={mockUsers.member}
        navigation={navigation}
        profileLinks={profileLinks}
        cohortLabel={formatCohortLabel(mockCohorts.fall2026)}
      />
      <MemberWorkspace initialAttempts={mockSubmissions.filter((attempt) => attempt.enrollmentId === mockEnrollments[0].id)}>{children}</MemberWorkspace>
    </div>
  );
}
