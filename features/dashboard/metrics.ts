import { MACHINE_STATUSES, type MachineStatus } from "@/features/machine/schema";

/**
 * ตัวคำนวณของหน้าภาพรวม — ฟังก์ชันบริสุทธิ์ ไม่แตะฐานข้อมูล จึงเขียน unit test ได้
 * ข้อมูลดิบมาจาก view ใน migration 006 (ฐานข้อมูลนับให้แล้ว ที่นี่แค่รวม/เติมช่องว่าง)
 * วันที่ทั้งหมดเป็นสตริง "YYYY-MM-DD" ตามเวลาไทย
 */

export type CodeDailyRow = { day: string; alarm_code: string; total: number };
export type RepairDailyRow = { day: string; closed: number; repair_minutes: number | string | null };

export const DASHBOARD_RANGES = [7, 30] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

/** ค่าจาก URL (?range=30) — อะไรที่ไม่ใช่ 30 ถือเป็น 7 วัน */
export function parseRange(value: string | undefined): DashboardRange {
  return value === "30" ? 30 : 7;
}

/** บวก/ลบวันจากสตริงวันที่ (คำนวณแบบ UTC ล้วน จึงไม่เพี้ยนเพราะ timezone ของเครื่อง) */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** วันแรกของช่วง เช่น 7 วันล่าสุดที่จบวันนี้ = วันนี้ − 6 */
export function rangeStart(today: string, days: DashboardRange): string {
  return addDays(today, -(days - 1));
}

/** จำนวน Alarm ต่อวัน — เติม 0 ให้วันที่ไม่มี Alarm เพื่อให้กราฟไม่ขาดช่วง (REQ-DSH-04) */
export function dailySeries(rows: CodeDailyRow[], today: string, days: DashboardRange) {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.total);

  const start = rangeStart(today, days);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(start, i);
    const [, m, d] = day.split("-");
    return { day, label: `${Number(d)}/${Number(m)}`, total: byDay.get(day) ?? 0 };
  });
}

/**
 * Pareto ของรหัส Alarm (REQ-BON-02): เรียงจากเกิดบ่อยสุด + % สะสม
 * % สะสมคิดจากยอดรวมทุกรหัส แม้จะแสดงแค่ limit รหัสแรก — เพื่อให้ตอบได้ว่า "กี่รหัสแรกคิดเป็น 80%"
 */
export function pareto(rows: CodeDailyRow[], fromDay: string, limit = 8) {
  const byCode = new Map<string, number>();
  for (const r of rows) {
    if (r.day < fromDay) continue; // สตริง YYYY-MM-DD เทียบกันตรง ๆ ได้
    byCode.set(r.alarm_code, (byCode.get(r.alarm_code) ?? 0) + r.total);
  }
  const sorted = [...byCode.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const grand = sorted.reduce((sum, [, n]) => sum + n, 0);

  let running = 0;
  const items = sorted.slice(0, limit).map(([code, total]) => {
    running += total;
    return { code, total, cumPct: grand === 0 ? 0 : Math.round((running / grand) * 1000) / 10 };
  });
  return { items, grandTotal: grand, codeCount: sorted.length };
}

/**
 * MTTR (Mean Time To Repair) = เวลาซ่อมรวม ÷ จำนวน Alarm ที่ปิดในช่วง
 * เวลาซ่อมของ Alarm หนึ่งตัว = เวลาปิด − เวลาเกิด
 */
export function mttr(rows: RepairDailyRow[], fromDay: string): { closed: number; minutes: number | null } {
  let closed = 0;
  let minutes = 0;
  for (const r of rows) {
    if (r.day < fromDay) continue;
    closed += r.closed;
    minutes += Number(r.repair_minutes ?? 0);
  }
  return { closed, minutes: closed === 0 ? null : minutes / closed };
}

/** แสดงระยะเวลาเป็นภาษาไทยแบบสั้น เช่น "45 นาที", "2 ชม. 5 นาที", "1 วัน 3 ชม." */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} นาที`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h < 24) return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${d} วัน ${hr} ชม.` : `${d} วัน`;
}

/** นับเครื่องตามสถานะ — ทุกสถานะมีค่าเสมอ (อย่างน้อย 0) (REQ-DSH-02) */
export function countByStatus(machines: { status: MachineStatus }[]): Record<MachineStatus, number> {
  const counts = Object.fromEntries(MACHINE_STATUSES.map((s) => [s, 0])) as Record<MachineStatus, number>;
  for (const m of machines) counts[m.status] += 1;
  return counts;
}

/** จัดเครื่องเป็นกลุ่มตามไลน์ผลิต (location) เรียงชื่อไลน์ และเรียงรหัสเครื่องในไลน์ */
export function groupByLocation<T extends { location: string; machine_id: string }>(machines: T[]) {
  const groups = new Map<string, T[]>();
  for (const m of machines) {
    const key = m.location.trim();
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "th"))
    .map(([location, list]) => ({ location, machines: list.sort((a, b) => a.machine_id.localeCompare(b.machine_id)) }));
}
