import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { createAlarm } from "@/features/alarm/actions";
import { AlarmForm } from "@/features/alarm/components/alarm-form";
import { getMachineOptions, isUuid } from "@/features/machine/queries";
import { requireStaff } from "@/lib/auth/dal";
import { toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "บันทึก Alarm" };

type Props = { searchParams: Promise<{ machine?: string }> };

export default async function NewAlarmPage({ searchParams }: Props) {
  await requireStaff(); // Admin + Technician (REQ-ALM-01) — Viewer ถูกส่งไป /forbidden
  const { machine } = await searchParams;
  const machines = await getMachineOptions();

  return (
    <>
      <PageTitle title="บันทึก Alarm" sub="Alarm Record" />
      <div className="max-w-3xl">
        <GroupBox title="ข้อมูล Alarm">
          {machines.length === 0 ? (
            <p className="text-muted">ยังไม่มีเครื่องจักรในระบบ — ให้ผู้ดูแลระบบเพิ่มเครื่องจักรก่อน</p>
          ) : (
            <AlarmForm
              mode="create"
              action={createAlarm}
              machines={machines}
              nowLocal={toBangkokLocalInput(new Date().toISOString())}
              presetMachineId={machine && isUuid(machine) ? machine : undefined}
            />
          )}
        </GroupBox>
      </div>
    </>
  );
}
