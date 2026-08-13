import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { mockCohorts, mockUsers } from "@/lib/program/mock-data";
import { formatCohortLabel } from "@/lib/program/state";

const navigation = [{ label: "Program", href: "/program", current: true }] as const;
const profileLinks = [
  { label: "Program overview", href: "/program" },
  { label: "Public home", href: "/" },
] as const;

export default function ProgramLayout({ children }: { children: ReactNode }) {
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
