import { Suspense, type ReactNode } from "react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { readWorkspace } from '@/lib/supabase/data';
import { ActivityRecorder } from '@/components/shell/activity-recorder';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user,state } = await readWorkspace(true);
  return <Suspense fallback={null}><ActivityRecorder /><AdminWorkspace user={user} initialState={state}>{children}</AdminWorkspace></Suspense>;
}
