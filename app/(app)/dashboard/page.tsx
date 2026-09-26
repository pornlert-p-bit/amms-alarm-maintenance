import type { Metadata } from "next";
import Link from "next/link";

import { AlarmStatusBadge } from "@/components/station/alarm-status-badge";
import { GroupBox } from "@/components/station/group-box";
import { PageHeader } from "@/components/station/page-title";
import { DailyAlarmChart, ParetoChart } from "@/features/dashboard/components/charts";
import { KpiTile } from "@/features/dashboard/components/kpi-tile";
import { PlantFloor } from "@/features/dashboard/components/plant-floor";
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

/** หน้าภาพรวม — ทุก Role ดูได้ (REQ-DSH-01…05, REQ-BON-01, REQ-BON-02) */
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

  return (
    <>
      <PageHeader title="ภาพรวมโรงงาน" sub={`ยินดีต้อนรับ ${user.fullName}`}>
        {rangeSwitch}
      </PageHeader>

      <div className="space-y-6">
        <GroupBox title="สรุปสถานะ" aside={`MTTR และกราฟ: ${range} วันล่าสุด`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            <KpiTile label="เครื่องทั้งหมด" value={data.machines.length} sub="เครื่อง" href="/machines" />
            <KpiTile label="ทำงาน" code="RUN" value={counts.Running} sub="เครื่อง" />
            <KpiTile label="หยุด" code="STOP" value={counts.Stop} sub="เครื่อง" />
            <KpiTile label="เกิด Alarm" code="ALARM" value={counts.Alarm} sub="เครื่อง" tone={counts.Alarm > 0 ? "bad" : "neutral"} />
            <KpiTile label="ซ่อมบำรุง" code="MAINT" value={counts.Maintenance} sub="เครื่อง" tone={counts.Maintenance > 0 ? "warn" : "neutral"} />
            <KpiTile label="Alarm ค้าง" value={data.openAlarmCount} sub="รายการที่ยังไม่ปิด" href="/alarms"
              tone={data.openAlarmCount > 0 ? "bad" : "neutral"} />
            <KpiTile label="งานซ่อมค้าง" value={data.activeJobCount}
              sub={data.waitingPartCount > 0 ? `รออะไหล่ ${data.waitingPartCount}` : "ใบงานที่ยังไม่เสร็จ"} href="/maintenance"
              tone={data.waitingPartCount > 0 ? "warn" : "neutral"} />
            <KpiTile label="MTTR" value={repair ? formatDuration(repair.minutes) : "—"}
              sub={repair ? `จาก ${repair.closed} Alarm ที่ปิด` : "ยังไม่รัน migration 006"} />
          </div>
        </GroupBox>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <GroupBox title="ผังเครื่องจักร" aside="คลิกเครื่องเพื่อดูประวัติ">
            <PlantFloor lines={lines} />
          </GroupBox>

          <GroupBox title="Alarm ล่าสุด" aside={<Link href="/alarms" className="text-accent hover:underline">ทั้งหมด ›</Link>}>
            {data.recentAlarms.length === 0 ? (
              <p className="py-6 text-center text-muted">ยังไม่มี Alarm ในระบบ</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentAlarms.map((a) => (
                  <li key={a.id}>
                    <Link href={`/alarms/${a.id}`}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-1 py-2 hover:bg-accent-soft/40 ${a.status === "Open" ? "bg-bad-bg/40" : ""}`}>
                      <span className="truncate text-[13px]">
                        <span className="font-mono font-semibold">{a.machine?.machine_id ?? "—"}</span>
                        <span className="mx-1.5 text-muted">·</span>
                        <span className="font-mono">{a.alarm_code}</span>
                      </span>
                      <AlarmStatusBadge status={a.status} />
                      <span className="font-mono text-[11.5px] text-muted">{formatDateTime(a.occurred_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GroupBox>
        </div>

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
      </div>
    </>
  );
}
