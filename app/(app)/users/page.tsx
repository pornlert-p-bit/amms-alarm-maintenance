import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "ผู้ใช้งาน" };

export default async function UsersPage() {
  // Admin เท่านั้น — Technician/Viewer ที่พิมพ์ URL นี้เองจะถูกส่งไป /forbidden (REQ-SEC-02)
  await requireAdmin();
  return <ComingSoon title="จัดการผู้ใช้และสิทธิ์" due="จ. 28 ก.ย." />;
}
