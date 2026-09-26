import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Alarm" };

export default async function AlarmsPage() {
  await requireUser();
  return <ComingSoon title="Alarm Record" due="อา. 27 ก.ย." />;
}
