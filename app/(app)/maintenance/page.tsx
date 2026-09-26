import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "งานซ่อมบำรุง" };

export default async function MaintenancePage() {
  await requireUser();
  return <ComingSoon title="งานซ่อมบำรุง (Maintenance Record)" due="จ. 28 ก.ย." />;
}
