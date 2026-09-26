import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AlarmStatusBadge } from "@/components/station/alarm-status-badge";
import { GroupBox } from "@/components/station/group-box";
import { PageHeader } from "@/components/station/page-title";
import { buttonClass, Notice } from "@/components/station/ui";
import { AlarmActions } from "@/features/alarm/components/alarm-actions";
import { getAlarmById } from "@/features/alarm/queries";
import { nextAlarmStatuses } from "@/features/alarm/rules";
import { getStaffDirectory, staffNameOf } from "@/features/staff/queries";
import { requireUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "รายละเอียด Alarm" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
};

export default async function AlarmDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const [alarm, staffList] = await Promise.all([getAlarmById(id), getStaffDirectory()]);
  if (!alarm) notFound();

  const canAct = isStaff(user.role) && alarm.status !== "Closed";

  const rows: [string, React.ReactNode, boolean?][] = [
    ["เครื่องจักร", <>
      {alarm.machine ? (
        <Link href={`/machines/${alarm.machine.id}`} className="font-mono font-semibold text-accent hover:underline">{alarm.machine.machine_id}</Link>
      ) : "—"} · {alarm.machine?.machine_name}
      {alarm.machine?.deleted_at && <span className="ml-1 text-xs text-muted">(ลบแล้ว)</span>}
    </>],
    ["รหัส Alarm", <span key="c" className="font-mono font-semibold">{alarm.alarm_code}</span>],
    ["รายละเอียด", alarm.description],
    ["เวลาเกิด", <span key="t" className="font-mono">{formatDateTime(alarm.occurred_at)}</span>],
    ["ผู้บันทึก", staffNameOf(staffList, alarm.created_by)],
    ["สถานะ", <AlarmStatusBadge key="s" status={alarm.status} />],
    ["สาเหตุ", alarm.cause ?? "—", alarm.status === "Closed"],
    ["ผู้ปิด", staffNameOf(staffList, alarm.closed_by), alarm.status === "Closed"],
    ["เวลาปิด", <span key="ct" className="font-mono">{formatDateTime(alarm.closed_at)}</span>, alarm.status === "Closed"],
  ];

  return (
    <>
      <PageHeader title={`Alarm ${alarm.alarm_code}`} sub={alarm.machine?.machine_name ?? ""}>
        {canAct && (
          <>
            <Link href={`/maintenance/new?alarm=${alarm.id}`} className={buttonClass.secondary}>เปิดใบงานซ่อม</Link>
            <Link href={`/alarms/${alarm.id}/edit`} className={buttonClass.secondary}>แก้ไขรายละเอียด</Link>
          </>
        )}
        <Link href="/alarms" className={buttonClass.secondary}>‹ กลับรายการ</Link>
      </PageHeader>

      {sp.created && <Notice tone="ok">บันทึก Alarm แล้ว</Notice>}
      {sp.updated === "started" && <Notice tone="ok">รับงานแล้ว — สถานะเป็น In Progress</Notice>}
      {sp.updated === "closed" && <Notice tone="ok">ปิด Alarm แล้ว</Notice>}
      {sp.updated === "edited" && <Notice tone="ok">บันทึกการแก้ไขแล้ว</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <GroupBox title="ข้อมูล Alarm">
          <dl className="divide-y divide-line">
            {rows
              .filter(([, , show]) => show !== false)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2">
                  <dt className="flex items-center gap-2 text-[13.5px] text-ink-2">
                    <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-accent" />
                    {label}
                  </dt>
                  <dd className="text-[13.5px]">{value}</dd>
                </div>
              ))}
          </dl>
        </GroupBox>

        <GroupBox title="การดำเนินการ">
          {canAct ? (
            <AlarmActions alarmId={alarm.id} nextStatuses={nextAlarmStatuses(alarm.status)} />
          ) : (
            <p className="text-muted">
              {alarm.status === "Closed"
                ? "Alarm นี้ปิดแล้ว — เปลี่ยนสถานะไม่ได้"
                : "บัญชีของคุณดูได้อย่างเดียว"}
            </p>
          )}
        </GroupBox>
      </div>
    </>
  );
}
