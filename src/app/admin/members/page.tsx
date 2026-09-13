import type { Metadata } from "next";
import { AdminMembers } from "@/components/admin/admin-members";
export const metadata: Metadata = { title: "Members | GAP Admin" };
export default function AdminMembersPage() { return <AdminMembers />; }
