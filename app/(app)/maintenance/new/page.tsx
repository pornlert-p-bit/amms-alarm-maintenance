import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { getMachineOptions, isUuid } from "@/features/machine/queries";
import { createMaintenance } from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/components/maintenance-form";
import { getOpenAlarmOptions } from "@/features/maintenance/queries";
import { getStaffDirectory } from "@/features/staff/queries";
import { requireStaff } from "@/lib/auth/dal";
import { toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "เปิดใบงานซ่อม" };

type Props = { searchParams: Promise<{ machine?: string; alarm?: string }> };

/** เปิดใบงานซ่อม — มาจากปุ่มบนบอร์ด หรือจากหน้า Alarm (?alarm=… จะเลือกเครื่องและ Alarm ให้เลย) */
export default async function NewMaintenancePage({ searchParams }: Props) {
  const user = await requireStaff(); // Admin + Technician (REQ-MNT-01)
  const sp = await searchParams;

  const [machines, alarms, staffList] = await Promise.all([getMachineOptions(), getOpenAlarmOptions(), getStaffDirectory()]);
  const technicians = staffList.filter((s) => s.role === "admin" || s.role === "technician");

  // ถ้ามาจากหน้า Alarm ให้เลือกเครื่องของ Alarm นั้นให้อัตโนมัติ
  const presetAlarm = sp.alarm && isUuid(sp.alarm) ? alarms.find((a) => a.id === sp.alarm) : undefined;
  const presetMachine = presetAlarm?.machine_id ?? (sp.machine && isUuid(sp.machine) ? sp.machine : undefined);

  return (
    <>
      <PageTitle title="เปิดใบงานซ่อม" sub="Maintenance Record" />
      <div className="max-w-3xl">
        <GroupBox title="ข้อมูลใบงาน">
          {machines.length === 0 ? (
            <p className="text-muted">ยังไม่มีเครื่องจักรในระบบ — ให้ผู้ดูแลระบบเพิ่มเครื่องจักรก่อน</p>
          ) : technicians.length === 0 ? (
            <p className="text-muted">โหลดรายชื่อช่างไม่ได้ — ตรวจว่ารัน migration 002 แล้ว (ดู RUNBOOK §2.6)</p>
          ) : (
            <MaintenanceForm
              mode="create"
              action={createMaintenance}
              machines={machines}
              alarms={alarms}
              technicians={technicians}
              nowLocal={toBangkokLocalInput(new Date().toISOString())}
              preset={{
                machine_id: presetMachine,
                alarm_id: presetAlarm?.id,
                // ค่าเริ่มต้นช่าง = คนที่เปิดใบงาน ถ้าเป็นช่าง
                ...(user.role === "technician" ? { technician_id: user.id } : {}),
              }}
            />
          )}
        </GroupBox>
      </div>
    </>
  );
}
