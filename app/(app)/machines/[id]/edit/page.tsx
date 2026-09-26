import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { updateMachine } from "@/features/machine/actions";
import { MachineForm } from "@/features/machine/components/machine-form";
import { getMachineById } from "@/features/machine/queries";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "แก้ไขเครื่องจักร" };

type Props = { params: Promise<{ id: string }> };

export default async function EditMachinePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params; // Next.js 16: params เป็น Promise

  const machine = await getMachineById(id);
  if (!machine) notFound();

  return (
    <>
      <PageTitle title={`แก้ไขเครื่องจักร ${machine.machine_id}`} sub={machine.machine_name} />
      <div className="max-w-3xl">
        <GroupBox title="ข้อมูลเครื่องจักร">
          {/* bind(null, id) = ผูก id ของเครื่องเข้ากับ action ฝั่ง server ไม่ได้ส่งผ่านช่องในฟอร์ม */}
          <MachineForm
            action={updateMachine.bind(null, machine.id)}
            defaults={machine}
            submitLabel="บันทึกการแก้ไข"
          />
        </GroupBox>
      </div>
    </>
  );
}
