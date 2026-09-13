import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = { title: "Admin | GAP" };

export default function AdminPage() {
  return <AdminOverview />;
}
