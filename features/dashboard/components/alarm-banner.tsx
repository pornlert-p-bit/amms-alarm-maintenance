import Link from "next/link";

import { formatDateTime } from "@/lib/format";

import type { ActiveAlarm } from "../queries";

/** แสดงบนแถบได้กี่รายการ ที่เหลือกดดูในหน้า Alarm */
const SHOWN = 4;

/**
 * แถบ Alarm ด้านบนสุดของหน้าจอ แบบจอ SCADA/HMI ในห้องควบคุม
 * - ไม่มี Alarm ค้าง → แถบเทา "ระบบปกติ" (ISA-101: สภาวะปกติไม่ต้องดึงความสนใจ)
 * - มี Alarm ที่ยังไม่มีผู้รับ (Open) → แถบแดง และไอคอนกะพริบ
 *   ตามแนว ISA-18.2: Alarm ที่ยังไม่มีคนรับทราบต้อง "กะพริบ" จนกว่าจะมีคนรับ (ในระบบนี้ = กดรับงาน)
 *   ผู้ที่ตั้งค่าให้ลดการเคลื่อนไหวในเครื่อง (prefers-reduced-motion) จะไม่เห็นการกะพริบ
 * - มีแต่ In Progress → แถบส้ม (มีคนรับแล้ว กำลังแก้)
 */
export function AlarmBanner({ alarms }: { alarms: ActiveAlarm[] }) {
  const open = alarms.filter((a) => a.status === "Open").length;
  const inProgress = alarms.length - open;

  if (alarms.length === 0) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-[3px] border border-line-strong bg-white px-3 py-2 text-[13px] text-ink-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-line-strong" />
        ไม่มี Alarm ค้าง — ระบบปกติ
      </div>
    );
  }

  const hot = open > 0;
  return (
    <div
      role="alert"
      aria-label={`Alarm ค้าง ${alarms.length} รายการ ยังไม่มีผู้รับ ${open} รายการ`}
      className={`flex flex-wrap items-stretch overflow-hidden rounded-[3px] border ${hot ? "border-bad" : "border-warn"} bg-white`}
    >
      <div className={`flex items-center gap-2 px-3 py-2 font-mono text-[13px] font-bold ${hot ? "bg-bad text-white" : "bg-warn-bg text-warn-ink"}`}>
        <span aria-hidden="true" className={hot ? "motion-safe:animate-pulse" : ""}>▲</span>
        {alarms.length} ALARM
      </div>
      <div className="flex items-center gap-3 border-r border-line px-3 text-xs">
        {open > 0 && <span className="font-semibold text-bad-ink">ยังไม่มีผู้รับ {open}</span>}
        {inProgress > 0 && <span className="text-warn-ink">กำลังแก้ {inProgress}</span>}
      </div>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 px-2 py-1.5">
        {alarms.slice(0, SHOWN).map((a) => (
          <li key={a.id}>
            <Link
              href={`/alarms/${a.id}`}
              title={`${a.machine_code} ${a.alarm_code} — ${formatDateTime(a.occurred_at)}`}
              className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-xs hover:bg-panelhead ${a.status === "Open" ? "border-bad text-bad-ink" : "border-warn text-warn-ink"}`}
            >
              <span className="font-semibold">{a.machine_code}</span>
              <span>{a.alarm_code}</span>
              <span className="text-muted">{formatDateTime(a.occurred_at).slice(-5)}</span>
            </Link>
          </li>
        ))}
        {alarms.length > SHOWN && <li className="px-1 text-xs text-muted">+{alarms.length - SHOWN}</li>}
      </ul>
      <Link href="/alarms" className="flex items-center border-l border-line px-3 text-xs text-accent hover:bg-panelhead">
        ดูทั้งหมด ›
      </Link>
    </div>
  );
}
