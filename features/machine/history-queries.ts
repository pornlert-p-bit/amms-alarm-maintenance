import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isUuid, type Machine } from "./queries";
import type { HistoryAlarm, HistoryJob, HistoryStatusChange } from "./timeline";

/**
 * การอ่านข้อมูลหน้า Machine History — ทุก Role ดูได้ (RLS ของ alarms / maintenance_records /
 * machine_status_history ให้ authenticated อ่านได้ทั้งหมด)
 */

/** เพดานต่อแหล่งข้อมูล กันหน้าช้าถ้าเลือกช่วงยาวมาก — ถ้าถึงเพดานหน้าจะแจ้งให้แคบช่วงลง */
export const HISTORY_LIMIT = 300;

/** อ่านเครื่องรวมเครื่องที่ถูกลบแล้ว — ประวัติของเครื่องที่ถูกลบยังต้องดูย้อนหลังได้ */
export async function getMachineForHistory(id: string): Promise<(Machine & { deleted_at: string | null }) | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("machines")
    .select("id, machine_id, machine_name, machine_type, location, status, updated_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`getMachineForHistory failed: id=${id}, code=${error.code ?? "unknown"}`);
    throw new Error("โหลดข้อมูลเครื่องจักรไม่สำเร็จ");
  }
  return data as (Machine & { deleted_at: string | null }) | null;
}

export async function getMachineHistory(
  machineId: string,
  range: { fromIso: string; toIso: string },
): Promise<{ alarms: HistoryAlarm[]; jobs: HistoryJob[]; changes: HistoryStatusChange[]; truncated: boolean }> {
  const supabase = await createSupabaseServerClient();

  const [alarms, jobs, changes] = await Promise.all([
    supabase
      .from("alarms")
      .select("id, alarm_code, description, occurred_at, status, cause, closed_at, closed_by, created_by")
      .eq("machine_id", machineId)
      .gte("occurred_at", range.fromIso)
      .lt("occurred_at", range.toIso)
      .order("occurred_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("maintenance_records")
      .select("id, problem, status, maintained_at, action_taken, technician_id, updated_at")
      .eq("machine_id", machineId)
      .gte("maintained_at", range.fromIso)
      .lt("maintained_at", range.toIso)
      .order("maintained_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("machine_status_history")
      .select("from_status, to_status, source, changed_by, changed_at")
      .eq("machine_id", machineId)
      .gte("changed_at", range.fromIso)
      .lt("changed_at", range.toIso)
      .order("changed_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);

  const err = alarms.error ?? jobs.error ?? changes.error;
  if (err) {
    console.error(`getMachineHistory failed: machine=${machineId}, code=${err.code ?? "unknown"}`);
    throw new Error("โหลดประวัติเครื่องจักรไม่สำเร็จ");
  }

  const a = (alarms.data ?? []) as HistoryAlarm[];
  const j = (jobs.data ?? []) as HistoryJob[];
  const c = (changes.data ?? []) as HistoryStatusChange[];
  return {
    alarms: a,
    jobs: j,
    changes: c,
    truncated: [a, j, c].some((list) => list.length >= HISTORY_LIMIT),
  };
}
