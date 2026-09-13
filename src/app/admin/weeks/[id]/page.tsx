import type { Metadata } from "next";
import { AdminWeekEditor } from "@/components/admin/admin-week-editor";
export const metadata: Metadata = { title: "Edit week | GAP Admin" };
export default async function AdminWeekPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminWeekEditor weekId={id} />; }
