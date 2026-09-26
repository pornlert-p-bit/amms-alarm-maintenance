import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupBox } from "@/components/station/group-box";
import { MntStatusBadge } from "@/components/station/mnt-status-badge";
import { PageTitle } from "@/components/station/page-title";
import { buttonClass, Notice } from "@/components/station/ui";
import { MaintenanceActions } from "@/features/maintenance/components/maintenance-actions";
import { getMaintenanceById } from "@/features/maintenance/queries";
import { nextMntStatuses } from "@/features/maintenance/rules";
import { getStaffDirectory, staffNameOf } from "@/features/staff/queries";
import { requireUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "รายละเอียดใบงานซ่อม" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
};

export default async function MaintenanceDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const [mnt, staffList] = await Promise.all([getMaintenanceById(id), getStaffDirectory()]);
  if (!mnt) notFound();

  const done = mnt.status === "Done";
  const canAct = isStaff(user.role) && !done;

  const rows: [string, React.ReactNode, boolean?][] = [
    ["เครื่องจักร", <>
      <span className="font-mono font-semibold">{mnt.machine?.machine_id ?? "—"}</span> · {mnt.machine?.machine_name}
      {mnt.machine?.deleted_at && <span className="ml-1 text-xs text-muted">(ลบแล้ว)</span>}
    </>],
    ["Alarm ต้นเรื่อง", mnt.alarm
      ? <Link key="a" href={`/alarms/${mnt.alarm.id}`} className="font-mono font-semibold text-accent hover:underline">{mnt.alarm.alarm_code}</Link>
      : <span key="a" className="text-muted">— (งานตามแผน / ไม่ผูก Alarm)</span>],
    ["ปัญหา / งาน", mnt.problem],
    ["ช่างผู้รับผิดชอบ", staffNameOf(staffList, mnt.technician_id)],
    ["วันเวลาเข้าซ่อม", <span key="t" className="font-mono">{formatDateTime(mnt.maintained_at)}</span>],
    ["ผู้เปิดใบงาน", staffNameOf(staffList, mnt.created_by)],
    ["สถานะ", <MntStatusBadge key="s" status={mnt.status} />],
    ["การแก้ไขที่ทำ", mnt.action_taken ?? "—", done],
    ["ปิดงานเมื่อ", <span key="u" className="font-mono">{formatDateTime(mnt.updated_at)}</span>, done],
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="ใบงานซ่อม" sub={`${mnt.machine?.machine_id ?? ""} · ${mnt.machine?.machine_name ?? ""}`} />
        <div className="flex gap-2">
          {canAct && (
            <Link href={`/maintenance/${mnt.id}/edit`} className={buttonClass.secondary}>แก้ไขรายละเอียด</Link>
          )}
          <Link href="/maintenance" className={buttonClass.secondary}>‹ กลับบอร์ด</Link>
        </div>
      </div>

      {sp.created && <Notice tone="ok">เปิดใบงานซ่อมแล้ว</Notice>}
      {sp.updated && <Notice tone="ok">บันทึกแล้ว</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <GroupBox title="ข้อมูลใบงาน">
          <dl className="divide-y divide-line">
            {rows
              .filter(([, , show]) => show !== false)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-2">
                  <dt className="flex items-center gap-2 text-[13.5px] text-ink-2">
                    <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-accent" />
                    {label}
                  </dt>
                  <dd className="whitespace-pre-line text-[13.5px]">{value}</dd>
                </div>
              ))}
          </dl>
        </GroupBox>

        <GroupBox title="การดำเนินการ">
          {canAct ? (
            <MaintenanceActions id={mnt.id} status={mnt.status} nextStatuses={nextMntStatuses(mnt.status)} />
          ) : (
            <p className="text-muted">
              {done ? "ใบงานนี้เสร็จแล้ว — แก้ไขไม่ได้ (เก็บเป็นประวัติการซ่อม)" : "บัญชีของคุณดูได้อย่างเดียว"}
            </p>
          )}
        </GroupBox>
      </div>
    </>
  );
}
