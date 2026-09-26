import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { updateMaintenanceDetails } from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/components/maintenance-form";
import { getMaintenanceById } from "@/features/maintenance/queries";
import { getStaffDirectory } from "@/features/staff/queries";
import { requireStaff } from "@/lib/auth/dal";
import { toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "แก้ไขใบงานซ่อม" };

type Props = { params: Promise<{ id: string }> };

export default async function EditMaintenancePage({ params }: Props) {
  await requireStaff();
  const { id } = await params;

  const [mnt, staffList] = await Promise.all([getMaintenanceById(id), getStaffDirectory()]);
  if (!mnt) notFound();
  if (mnt.status === "Done") redirect(`/maintenance/${mnt.id}`); // เสร็จแล้วแก้ไม่ได้

  const technicians = staffList.filter((s) => s.role === "admin" || s.role === "technician");
  const origin = `${mnt.machine?.machine_id ?? "—"} · ${mnt.machine?.machine_name ?? ""}  /  Alarm: ${mnt.alarm?.alarm_code ?? "—"}`;

  return (
    <>
      <PageTitle title="แก้ไขใบงานซ่อม" sub={mnt.machine?.machine_name ?? ""} />
      <div className="max-w-3xl">
        <GroupBox title="รายละเอียดใบงาน">
          <MaintenanceForm
            mode="edit"
            action={updateMaintenanceDetails.bind(null, mnt.id)}
            originLabel={origin}
            technicians={technicians}
            nowLocal={toBangkokLocalInput(new Date().toISOString())}
            defaults={{
              technician_id: mnt.technician_id ?? "",
              problem: mnt.problem,
              maintained_at: toBangkokLocalInput(mnt.maintained_at),
            }}
            cancelHref={`/maintenance/${mnt.id}`}
          />
        </GroupBox>
      </div>
    </>
  );
}
