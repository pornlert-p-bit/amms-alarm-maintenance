import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupBox } from "@/components/station/group-box";
import { MachineStatusBadge } from "@/components/station/machine-status-badge";
import { PageHeader } from "@/components/station/page-title";
import { buttonClass, inputClass, Notice } from "@/components/station/ui";
import { addDays, formatDuration } from "@/features/dashboard/metrics";
import { KpiTile } from "@/features/dashboard/components/kpi-tile";
import { getMachineForHistory, getMachineHistory, HISTORY_LIMIT } from "@/features/machine/history-queries";
import { buildTimeline, machineSummary, type TimelineEvent } from "@/features/machine/timeline";
import { getStaffDirectory, staffNameOf } from "@/features/staff/queries";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin, isStaff } from "@/lib/auth/roles";
import { bangkokDayRange, formatDate, toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "ประวัติเครื่องจักร" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

const DOT: Record<TimelineEvent["tone"], string> = {
  bad: "bg-bad",
  warn: "bg-warn",
  accent: "bg-accent",
  neutral: "bg-line-strong",
};

/** หน้า Machine History (REQ-BON-03) — ทุก Role ดูได้ ค่าเริ่มต้น 30 วันล่าสุด (REQ-BON-08) */
export default async function MachineHistoryPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const machine = await getMachineForHistory(id);
  if (!machine) notFound();

  // ช่วงวันที่ (เวลาไทย) — ไม่ระบุ = 30 วันล่าสุด, ระบุกลับด้าน = สลับให้
  const today = toBangkokLocalInput(new Date().toISOString()).slice(0, 10);
  let fromDay = sp.from && bangkokDayRange(sp.from) ? sp.from : addDays(today, -29);
  let toDay = sp.to && bangkokDayRange(sp.to) ? sp.to : today;
  if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
  const custom = Boolean(sp.from || sp.to);

  const [history, staff] = await Promise.all([
    getMachineHistory(machine.id, { fromIso: bangkokDayRange(fromDay)!.start, toIso: bangkokDayRange(toDay)!.end }),
    getStaffDirectory(),
  ]);
  const events = buildTimeline(history.alarms, history.jobs, history.changes);
  const summary = machineSummary(history.alarms, history.jobs);

  // จัดกลุ่มตามวัน (เวลาไทย) เพื่ออ่านง่าย
  const days = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const day = toBangkokLocalInput(e.at).slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), e]);
  }

  const deleted = Boolean(machine.deleted_at);

  return (
    <>
      <PageHeader title={`${machine.machine_id} · ${machine.machine_name}`} sub={`${machine.machine_type} · ${machine.location}`}>
        {isStaff(user.role) && !deleted && (
          <Link href={`/alarms/new?machine=${machine.id}`} className={buttonClass.secondary}>บันทึก Alarm</Link>
        )}
        {isAdmin(user.role) && !deleted && (
          <Link href={`/machines/${machine.id}/edit`} className={buttonClass.secondary}>แก้ไขเครื่องจักร</Link>
        )}
        <Link href="/machines" className={buttonClass.secondary}>‹ กลับรายการ</Link>
      </PageHeader>

      {deleted && <Notice tone="info">เครื่องนี้ถูกลบแล้วเมื่อ {formatDate(machine.deleted_at)} — แสดงประวัติย้อนหลังเท่านั้น</Notice>}

      <div className="space-y-6">
        <GroupBox title="สรุปช่วงที่เลือก" aside={<span className="flex items-center gap-2">สถานะตอนนี้ <MachineStatusBadge status={machine.status} /></span>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <KpiTile label="Alarm ทั้งหมด" value={summary.alarms} sub="ครั้งในช่วงนี้" href={`/alarms?machine=${machine.id}`} />
            <KpiTile label="Alarm ค้าง" value={summary.openAlarms} sub="ยังไม่ปิด" tone={summary.openAlarms > 0 ? "bad" : "neutral"} />
            <KpiTile label="MTTR" value={formatDuration(summary.mttrMinutes)} sub="เวลาซ่อมเฉลี่ย" />
            <KpiTile label="งานซ่อม" value={summary.jobs} sub={summary.activeJobs > 0 ? `ยังไม่เสร็จ ${summary.activeJobs}` : "ใบงาน"}
              tone={summary.activeJobs > 0 ? "warn" : "neutral"} />
            <KpiTile label="รหัสที่เกิดบ่อยสุด" value={summary.topCode ? summary.topCode.code : "—"}
              sub={summary.topCode ? `${summary.topCode.count} ครั้ง` : "ไม่มี Alarm"} />
          </div>
        </GroupBox>

        <GroupBox title="ประวัติ" aside={`${events.length} เหตุการณ์ · ${formatDate(bangkokDayRange(fromDay)!.start)} – ${formatDate(bangkokDayRange(toDay)!.start)}`}>
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 border-b border-line pb-4">
            <div>
              <label htmlFor="from" className="mb-1 block text-[13px] text-ink-2">ตั้งแต่วันที่</label>
              <input id="from" name="from" type="date" defaultValue={fromDay} className={inputClass(false, "font-mono")} />
            </div>
            <div>
              <label htmlFor="to" className="mb-1 block text-[13px] text-ink-2">ถึงวันที่</label>
              <input id="to" name="to" type="date" defaultValue={toDay} className={inputClass(false, "font-mono")} />
            </div>
            <button type="submit" className={buttonClass.secondary}>แสดง</button>
            {custom && <Link href={`/machines/${machine.id}`} className="py-2 text-[13px] text-accent hover:underline">30 วันล่าสุด</Link>}
          </form>

          {history.truncated && (
            <Notice tone="info">ช่วงนี้มีข้อมูลมากกว่า {HISTORY_LIMIT} รายการต่อประเภท แสดงเฉพาะรายการล่าสุด — เลือกช่วงวันที่ให้แคบลงเพื่อดูครบ</Notice>
          )}

          {events.length === 0 ? (
            <p className="py-6 text-center text-muted">ไม่มีเหตุการณ์ในช่วงวันที่นี้</p>
          ) : (
            <div className="space-y-5">
              {[...days.entries()].map(([day, list]) => (
                <section key={day} aria-label={formatDate(bangkokDayRange(day)!.start)}>
                  <h3 className="mb-2 font-mono text-[12.5px] font-semibold text-ink-2">{formatDate(bangkokDayRange(day)!.start)}</h3>
                  <ol className="relative ml-[5px] space-y-2 border-l border-line pl-5">
                    {list.map((e, i) => (
                      <li key={`${e.kind}-${e.at}-${i}`} className="relative">
                        <span aria-hidden="true" className={`absolute -left-[25px] top-[7px] h-[9px] w-[9px] rounded-full ring-2 ring-white ${DOT[e.tone]}`} />
                        <div className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
                          <span className="font-mono text-xs text-muted">{toBangkokLocalInput(e.at).slice(11, 16)}</span>
                          {e.href ? (
                            <Link href={e.href} className={`font-semibold hover:underline ${e.tone === "bad" ? "text-bad-ink" : "text-ink"}`}>{e.title}</Link>
                          ) : (
                            <span className="font-semibold">{e.title}</span>
                          )}
                          {e.actorId && <span className="text-xs text-muted">· {staffNameOf(staff, e.actorId)}</span>}
                        </div>
                        {e.detail && <p className="mt-0.5 text-[13px] text-ink-2">{e.detail}</p>}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </GroupBox>
      </div>
    </>
  );
}
