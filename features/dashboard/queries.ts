import "server-only";

import type { AlarmStatus } from "@/features/alarm/schema";
import type { MachineStatus } from "@/features/machine/schema";
import type { MntStatus } from "@/features/maintenance/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { CodeDailyRow, RepairDailyRow } from "./metrics";

/**
 * การอ่านข้อมูลของหน้าภาพรวม — อ่านอย่างเดียว ไม่มี Server Action (02 §3: Dashboard เป็นผู้อ่าน)
 * ทุก query ยิงพร้อมกันด้วย Promise.all
 */

export type FloorMachine = {
  id: string;
  machine_id: string;
  machine_name: string;
  location: string;
  status: MachineStatus;
  openAlarms: number;
  activeJobs: number;
};

export type RecentAlarm = {
  id: string;
  alarm_code: string;
  occurred_at: string;
  status: AlarmStatus;
  machine: { machine_id: string } | null;
};

/** Alarm ที่ยังไม่ปิด — ใช้ทำแถบ Alarm ด้านบนแบบจอ SCADA */
export type ActiveAlarm = {
  id: string;
  alarm_code: string;
  occurred_at: string;
  status: AlarmStatus;
  machine_code: string;
};

export type DashboardData = {
  machines: FloorMachine[];
  /** Alarm ที่ยังไม่ปิดของเครื่องที่ยังไม่ถูกลบ เรียงใหม่สุดก่อน */
  activeAlarms: ActiveAlarm[];
  activeJobCount: number;
  waitingPartCount: number;
  recentAlarms: RecentAlarm[];
  /** null = อ่าน view ไม่ได้ (ยังไม่รัน migration 006) — หน้าเว็บยังแสดงส่วนอื่นได้ */
  codeDaily: CodeDailyRow[] | null;
  repairDaily: RepairDailyRow[] | null;
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();

  const [machinesRes, alarmsRes, jobsRes, recentRes, codeRes, repairRes] = await Promise.all([
    // เครื่องทุกเครื่องต้องแสดงบนผังอยู่แล้ว จึงนับสถานะจากรายการนี้ได้เลย ไม่ต้องยิงแยก
    supabase.from("machines").select("id, machine_id, machine_name, location, status").is("deleted_at", null),
    // Alarm ที่ค้าง (จำนวนน้อยตามธรรมชาติ) — ใช้ทั้งแถบ Alarm ด้านบนและป้ายบนผัง
    supabase
      .from("alarms")
      .select("id, alarm_code, occurred_at, status, machine_id")
      .neq("status", "Closed")
      .order("occurred_at", { ascending: false }),
    supabase.from("maintenance_records").select("machine_id, status").neq("status", "Done"),
    supabase
      .from("alarms")
      .select("id, alarm_code, occurred_at, status, machine:machines(machine_id)")
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase.from("dashboard_alarm_code_daily").select("day, alarm_code, total"),
    supabase.from("dashboard_alarm_repair_daily").select("day, closed, repair_minutes"),
  ]);

  const coreError = machinesRes.error ?? alarmsRes.error ?? jobsRes.error ?? recentRes.error;
  if (coreError) {
    console.error(`getDashboardData failed: code=${coreError.code ?? "unknown"}`);
    throw new Error("โหลดข้อมูลภาพรวมไม่สำเร็จ");
  }
  const viewError = codeRes.error ?? repairRes.error;
  if (viewError) {
    // Graceful Failure (02 §6.1): กราฟหายไป แต่ตัวเลขและผังยังใช้ได้
    console.warn(`dashboard views failed: code=${viewError.code ?? "unknown"} (รัน supabase/migrations/006 แล้วหรือยัง?)`);
  }

  const openRows = (alarmsRes.data ?? []) as { id: string; alarm_code: string; occurred_at: string; status: AlarmStatus; machine_id: string }[];
  const openByMachine = tally(openRows.map((a) => a.machine_id));
  const jobs = (jobsRes.data ?? []) as { machine_id: string; status: MntStatus }[];
  const jobsByMachine = tally(jobs.map((j) => j.machine_id));

  const machines = ((machinesRes.data ?? []) as Omit<FloorMachine, "openAlarms" | "activeJobs">[]).map((m) => ({
    ...m,
    openAlarms: openByMachine.get(m.id) ?? 0,
    activeJobs: jobsByMachine.get(m.id) ?? 0,
  }));
  // นับเฉพาะของเครื่องที่ยังไม่ถูกลบ ให้ตรงกับที่เห็นบนผัง (04 §6)
  const active = new Set(machines.map((m) => m.id));
  const countActive = (map: Map<string, number>) =>
    [...map.entries()].reduce((sum, [id, n]) => sum + (active.has(id) ? n : 0), 0);

  const codeOf = new Map(machines.map((m) => [m.id, m.machine_id]));

  return {
    machines,
    activeAlarms: openRows
      .filter((a) => active.has(a.machine_id))
      .map((a) => ({ id: a.id, alarm_code: a.alarm_code, occurred_at: a.occurred_at, status: a.status, machine_code: codeOf.get(a.machine_id) ?? "—" })),
    activeJobCount: countActive(jobsByMachine),
    waitingPartCount: jobs.filter((j) => j.status === "Waiting Part" && active.has(j.machine_id)).length,
    recentAlarms: (recentRes.data ?? []) as unknown as RecentAlarm[],
    codeDaily: codeRes.error ? null : ((codeRes.data ?? []) as CodeDailyRow[]),
    repairDaily: repairRes.error ? null : ((repairRes.data ?? []) as RepairDailyRow[]),
  };
}

function tally(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
  return map;
}
