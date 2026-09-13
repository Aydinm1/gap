import { Suspense, type ReactNode } from "react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}><AdminWorkspace>{children}</AdminWorkspace></Suspense>;
}
