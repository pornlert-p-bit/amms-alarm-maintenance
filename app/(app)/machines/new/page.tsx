import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { createMachine } from "@/features/machine/actions";
import { MachineForm } from "@/features/machine/components/machine-form";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "เพิ่มเครื่องจักร" };

export default async function NewMachinePage() {
  await requireAdmin(); // หน้านี้สำหรับ Admin — Server Action ก็ตรวจซ้ำอีกชั้น

  return (
    <>
      <PageTitle title="เพิ่มเครื่องจักร" sub="Machine Master" />
      <div className="max-w-3xl">
        <GroupBox title="ข้อมูลเครื่องจักร">
          <MachineForm action={createMachine} submitLabel="บันทึกเครื่องจักร" />
        </GroupBox>
      </div>
    </>
  );
}
