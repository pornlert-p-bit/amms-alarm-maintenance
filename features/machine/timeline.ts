import type { AlarmStatus } from "@/features/alarm/schema";
import type { MntStatus } from "@/features/maintenance/schema";

import type { MachineStatus } from "./schema";

/**
 * ประวัติของเครื่องหนึ่งเครื่อง (REQ-BON-03) — รวม 3 แหล่งเป็นไทม์ไลน์เดียว เรียงใหม่สุดก่อน
 * ฟังก์ชันบริสุทธิ์ เขียน unit test ได้ (การอ่านฐานข้อมูลอยู่ใน history-queries.ts)
 */

export type HistoryAlarm = {
  id: string;
  alarm_code: string;
  description: string;
  occurred_at: string;
  status: AlarmStatus;
  cause: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
};

export type HistoryJob = {
  id: string;
  problem: string;
  status: MntStatus;
  maintained_at: string;
  action_taken: string | null;
  technician_id: string | null;
  updated_at: string;
};

export type HistoryStatusChange = {
  from_status: MachineStatus | null;
  to_status: MachineStatus;
  source: "manual" | "simulator" | "plc";
  changed_by: string | null;
  changed_at: string;
};

export type TimelineEvent = {
  at: string;
  kind: "alarm" | "alarm_closed" | "job" | "job_done" | "status";
  /** สีจุดบนไทม์ไลน์ตาม ISA-101: bad = ยังค้าง, warn = งานซ่อมที่ยังไม่เสร็จ, neutral = จบแล้ว/ปกติ */
  tone: "bad" | "warn" | "accent" | "neutral";
  title: string;
  detail?: string;
  actorId?: string | null;
  href?: string;
};

export function buildTimeline(alarms: HistoryAlarm[], jobs: HistoryJob[], changes: HistoryStatusChange[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const a of alarms) {
    events.push({
      at: a.occurred_at,
      kind: "alarm",
      tone: a.status === "Closed" ? "neutral" : "bad",
      title: `เกิด Alarm ${a.alarm_code}`,
      detail: a.description,
      actorId: a.created_by,
      href: `/alarms/${a.id}`,
    });
    if (a.status === "Closed" && a.closed_at) {
      events.push({
        at: a.closed_at,
        kind: "alarm_closed",
        tone: "neutral",
        title: `ปิด Alarm ${a.alarm_code}`,
        detail: a.cause ?? undefined,
        actorId: a.closed_by,
        href: `/alarms/${a.id}`,
      });
    }
  }

  for (const j of jobs) {
    events.push({
      at: j.maintained_at,
      kind: "job",
      tone: j.status === "Done" ? "neutral" : "warn",
      title: j.status === "Done" ? "เข้าซ่อม" : `เข้าซ่อม (${j.status})`,
      detail: j.problem,
      actorId: j.technician_id,
      href: `/maintenance/${j.id}`,
    });
    if (j.status === "Done") {
      // ใบงานที่ Done แก้ไม่ได้แล้ว (migration 005) — updated_at จึงเป็นเวลาปิดงาน
      events.push({
        at: j.updated_at,
        kind: "job_done",
        tone: "neutral",
        title: "ซ่อมเสร็จ",
        detail: j.action_taken ?? undefined,
        actorId: j.technician_id,
        href: `/maintenance/${j.id}`,
      });
    }
  }

  for (const c of changes) {
    events.push({
      at: c.changed_at,
      kind: "status",
      tone: "accent",
      title: `สถานะ ${c.from_status ?? "—"} → ${c.to_status}`,
      detail: c.source === "manual" ? undefined : `จาก ${c.source === "plc" ? "PLC" : "Simulator"}`,
      actorId: c.changed_by,
    });
  }

  // ใหม่สุดก่อน — เวลาเท่ากันให้ "ปิด" มาก่อน "เกิด" (อ่านจากบนลงล่างแล้วเข้าใจลำดับ)
  const order: Record<TimelineEvent["kind"], number> = { alarm_closed: 0, job_done: 1, status: 2, job: 3, alarm: 4 };
  // เทียบเป็นเวลาจริง ไม่เทียบสตริง (ค่าจากฐานข้อมูลบางตัวมีเศษวินาที บางตัวไม่มี)
  return events.sort((x, y) => Date.parse(y.at) - Date.parse(x.at) || order[x.kind] - order[y.kind]);
}

/** ตัวเลขสรุปของเครื่องในช่วงที่เลือก */
export function machineSummary(alarms: HistoryAlarm[], jobs: HistoryJob[]) {
  const closed = alarms.filter((a) => a.status === "Closed" && a.closed_at);
  const repairMinutes = closed.reduce(
    (sum, a) => sum + (new Date(a.closed_at!).getTime() - new Date(a.occurred_at).getTime()) / 60000,
    0,
  );
  const codes = new Map<string, number>();
  for (const a of alarms) codes.set(a.alarm_code, (codes.get(a.alarm_code) ?? 0) + 1);
  const topCode = [...codes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;

  return {
    alarms: alarms.length,
    openAlarms: alarms.length - closed.length,
    mttrMinutes: closed.length === 0 ? null : repairMinutes / closed.length,
    jobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status !== "Done").length,
    topCode: topCode ? { code: topCode[0], count: topCode[1] } : null,
  };
}
