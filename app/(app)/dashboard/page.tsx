import type { Metadata } from "next";
import Link from "next/link";

import { AlarmStatusBadge } from "@/components/station/alarm-status-badge";
import { GroupBox } from "@/components/station/group-box";
import { PageHeader } from "@/components/station/page-title";
import { StatusPill } from "@/components/station/status-pill";
import { tableClass } from "@/components/station/ui";
import { AlarmBanner } from "@/features/dashboard/components/alarm-banner";
import { DailyAlarmChart, ParetoChart } from "@/features/dashboard/components/charts";
import { ProductionLine } from "@/features/dashboard/components/production-line";
import {
  countByStatus,
  dailySeries,
  DASHBOARD_RANGES,
  formatDuration,
  groupByLocation,
  mttr,
  pareto,
  parseRange,
  rangeStart,
} from "@/features/dashboard/metrics";
import { getDashboardData } from "@/features/dashboard/queries";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime, toBangkokLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "ภาพรวม" };

type Props = { searchParams: Promise<{ range?: string }> };

/**
 * หน้าภาพรวม — ทุก Role ดูได้ (REQ-DSH-01…05, REQ-BON-01, REQ-BON-02)
 * จัดหน้าแบบจอ SCADA ในห้องควบคุม: แถบ Alarm บนสุด → แถบสถานะรวม → ผังสายการผลิต → แนวโน้ม → บันทึกเหตุการณ์
 * (เหตุผลการออกแบบ: ADR-007 Revision)
 */
export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireUser();
  const range = parseRange((await searchParams).range);
  const data = await getDashboardData();

  const today = toBangkokLocalInput(new Date().toISOString()).slice(0, 10); // วันนี้ตามเวลาไทย
  const from = rangeStart(today, range);

  const counts = countByStatus(data.machines);
  const lines = groupByLocation(data.machines);
  const repair = data.repairDaily ? mttr(data.repairDaily, from) : null;
  const daily = data.codeDaily ? dailySeries(data.codeDaily, today, range) : null;
  const top = data.codeDaily ? pareto(data.codeDaily, from) : null;

  const rangeSwitch = (
    <nav aria-label="ช่วงเวลา" className="flex gap-1 text-xs">
      {DASHBOARD_RANGES.map((r) => (
        <Link
          key={r}
          href={r === 7 ? "/dashboard" : `/dashboard?range=${r}`}
          aria-current={r === range ? "page" : undefined}
          className={`rounded-[3px] border px-2 py-0.5 font-mono ${r === range ? "border-accent bg-accent text-white" : "border-line-strong bg-white text-ink-2 hover:border-accent"}`}
        >
          {r} วัน
        </Link>
      ))}
    </nav>
  );
  const viewMissing = <p className="py-6 text-center text-muted">ยังแสดงกราฟไม่ได้ — ตรวจว่ารัน migration 006 แล้ว (RUNBOOK ข้อ 2.6)</p>;

  const mttrText = repair ? formatDuration(repair.minutes) : "—";

  return (
    <>
      <PageHeader title="หน้าจอควบคุมการผลิต" sub={`ยินดีต้อนรับ ${user.fullName}`}>
        {rangeSwitch}
      </PageHeader>

      <div className="space-y-6">
        {/* 1) แถบ Alarm — สิ่งแรกที่คนเฝ้าจอต้องเห็น (REQ-DSH-03) */}
        <AlarmBanner alarms={data.activeAlarms} />

        {/* 2) แถบสถานะรวม — แบบแถบสถานะด้านบนของจอ HMI ไม่ใช่แถวการ์ด (REQ-DSH-01, 02, 03) */}
        <div role="group" aria-label="สรุปสถานะ" className="-mt-3 flex flex-wrap gap-2">
          <Link href="/machines" className="rounded-[3px] hover:opacity-80">
            <StatusPill label="เครื่องทั้งหมด" value={data.machines.length} tone="neutral" />
          </Link>
          <StatusPill label="RUN" value={counts.Running} tone="neutral" />
          <StatusPill label="STOP" value={counts.Stop} tone="neutral" />
          <StatusPill label="ALARM" value={counts.Alarm} tone={counts.Alarm > 0 ? "bad" : "neutral"} />
          <StatusPill label="MAINT" value={counts.Maintenance} tone={counts.Maintenance > 0 ? "warn" : "neutral"} />
          <Link href="/maintenance" className="rounded-[3px] hover:opacity-80">
            <StatusPill
              label="งานซ่อมค้าง"
              value={data.waitingPartCount > 0 ? `${data.activeJobCount} · รออะไหล่ ${data.waitingPartCount}` : data.activeJobCount}
              tone={data.waitingPartCount > 0 ? "warn" : "neutral"}
            />
          </Link>
          <StatusPill label={`MTTR ${range} วัน`} value={repair ? `${mttrText} (${repair.closed})` : mttrText} tone="neutral" />
        </div>

        {/* 3) ผังสายการผลิต */}
        <GroupBox title="ผังสายการผลิต" aside="คลิกเครื่องเพื่อดูประวัติ">
          <ProductionLine lines={lines} />
          <p className="mt-2 text-xs text-muted">
            ALM = Alarm ค้าง · WO = ใบงานซ่อมที่ยังไม่เสร็จ · กรอบเส้นประ = เครื่องหยุด · ลูกศร = ทิศทางงานในไลน์
          </p>
        </GroupBox>

        {/* 4) แนวโน้ม */}
        <div className="grid gap-6 lg:grid-cols-2">
          <GroupBox title="Alarm ต่อวัน" aside={daily ? `รวม ${daily.reduce((s, d) => s + d.total, 0)} ครั้ง` : undefined}>
            {daily ? <DailyAlarmChart data={daily} /> : viewMissing}
          </GroupBox>

          <GroupBox title="Pareto รหัส Alarm" aside={top && top.codeCount > top.items.length ? `แสดง ${top.items.length} จาก ${top.codeCount} รหัส` : undefined}>
            {!top ? viewMissing : top.items.length === 0 ? (
              <p className="py-6 text-center text-muted">ไม่มี Alarm ในช่วง {range} วันล่าสุด</p>
            ) : (
              <>
                <ParetoChart data={top.items} />
                <p className="mt-2 text-xs text-muted">
                  แท่ง = จำนวนครั้ง · เส้นน้ำเงิน = % สะสม · เส้นประส้ม = 80% (รหัสทางซ้ายของจุดนี้คือกลุ่มที่ควรแก้ก่อน)
                </p>
              </>
            )}
          </GroupBox>
        </div>

        {/* 5) บันทึกเหตุการณ์ล่าสุด แบบ Event Summary ของจอ SCADA (REQ-DSH-05) */}
        <GroupBox title="บันทึกเหตุการณ์ Alarm ล่าสุด" aside={<Link href="/alarms" className="text-accent hover:underline">ทั้งหมด ›</Link>}>
          {data.recentAlarms.length === 0 ? (
            <p className="py-6 text-center text-muted">ยังไม่มี Alarm ในระบบ</p>
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>เวลาเกิด</th>
                    <th className={tableClass.th}>เครื่อง</th>
                    <th className={tableClass.th}>รหัส</th>
                    <th className={tableClass.th}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAlarms.map((a) => (
                    <tr key={a.id} className={a.status === "Open" ? "bg-bad-bg/40" : "hover:bg-accent-soft/40"}>
                      <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap`}>{formatDateTime(a.occurred_at)}</td>
                      <td className={`${tableClass.td} ${tableClass.mono} font-semibold`}>{a.machine?.machine_id ?? "—"}</td>
                      <td className={`${tableClass.td} ${tableClass.mono}`}>
                        <Link href={`/alarms/${a.id}`} className="text-accent hover:underline">{a.alarm_code}</Link>
                      </td>
                      <td className={tableClass.td}><AlarmStatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GroupBox>
      </div>
    </>
  );
}
