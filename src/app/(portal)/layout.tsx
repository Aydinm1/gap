import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { mockCohorts, mockUsers } from "@/lib/program/mock-data";
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
      {children}
    </div>
  );
}
