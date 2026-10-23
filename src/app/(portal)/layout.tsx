import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { readMember } from '@/lib/supabase/data';
import { MemberWorkspace } from "@/components/program/member-workspace";
import { formatCohortLabel } from "@/lib/program/state";
import { ActivityRecorder } from '@/components/shell/activity-recorder';

const navigation = [] as const;
const profileLinks = [] as const;

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const data = await readMember();
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <ActivityRecorder />
      <AppHeader
        user={data.user}
        navigation={navigation}
        profileLinks={data.user.role === 'admin' ? [{ label:'Admin workspace',href:'/admin' }] : profileLinks}
        cohortLabel={data.cohort ? formatCohortLabel(data.cohort) : undefined}
      />
      <MemberWorkspace key={data.enrollment?.id ?? data.user.id} initialAttempts={data.submissions}>{children}</MemberWorkspace>
    </div>
  );
}
