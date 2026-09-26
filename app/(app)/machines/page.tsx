import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "เครื่องจักร" };

export default async function MachinesPage() {
  await requireUser();
  return <ComingSoon title="เครื่องจักร (Machine Master)" due="อา. 27 ก.ย." />;
}
