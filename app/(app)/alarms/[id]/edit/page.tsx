import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { updateAlarmDetails } from "@/features/alarm/actions";
import { AlarmForm } from "@/features/alarm/components/alarm-form";
import { getAlarmById } from "@/features/alarm/queries";
import { requireStaff } from "@/lib/auth/dal";
import { toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "แก้ไข Alarm" };

type Props = { params: Promise<{ id: string }> };

export default async function EditAlarmPage({ params }: Props) {
  await requireStaff();
  const { id } = await params;

  const alarm = await getAlarmById(id);
  if (!alarm) notFound();
  if (alarm.status === "Closed") redirect(`/alarms/${alarm.id}`); // ปิดแล้วแก้ไม่ได้

  return (
    <>
      <PageTitle title={`แก้ไข Alarm ${alarm.alarm_code}`} sub={alarm.machine?.machine_name ?? ""} />
      <div className="max-w-3xl">
        <GroupBox title="รายละเอียด Alarm">
          <AlarmForm
            mode="edit"
            action={updateAlarmDetails.bind(null, alarm.id)}
            machineLabel={`${alarm.machine?.machine_id ?? "—"} · ${alarm.machine?.machine_name ?? ""}`}
            nowLocal={toBangkokLocalInput(new Date().toISOString())}
            defaults={{
              alarm_code: alarm.alarm_code,
              description: alarm.description,
              occurred_at: toBangkokLocalInput(alarm.occurred_at),
            }}
            cancelHref={`/alarms/${alarm.id}`}
          />
        </GroupBox>
      </div>
    </>
  );
}
