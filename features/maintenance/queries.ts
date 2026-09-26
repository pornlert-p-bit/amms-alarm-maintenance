import "server-only";

import { isUuid } from "@/features/machine/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { MntStatus } from "./schema";

/** การอ่านข้อมูลงานซ่อม — เรียกจาก Server Component เท่านั้น */

export type Maintenance = {
  id: string;
  problem: string;
  action_taken: string | null;
  maintained_at: string;
  status: MntStatus;
  technician_id: string | null;
  created_by: string | null;
  updated_at: string;
  machine: { id: string; machine_id: string; machine_name: string; deleted_at: string | null } | null;
  alarm: { id: string; alarm_code: string } | null;
};

const MNT_COLUMNS =
  "id, problem, action_taken, maintained_at, status, technician_id, created_by, updated_at, " +
  "machine:machines(id, machine_id, machine_name, deleted_at), alarm:alarms(id, alarm_code)";

/** ใบงานที่เสร็จแล้วแสดงบนบอร์ดแค่จำนวนนี้ (ล่าสุดก่อน) ไม่ให้คอลัมน์ Done ยาวไม่รู้จบ */
export const DONE_ON_BOARD = 20;

type BoardFilter = {
  machineId: string | null;
  technicianId: string | null;
  fromIso: string | null;
  toIso: string | null;
};

/**
 * ข้อมูลบอร์ด Kanban: งานที่ยังไม่เสร็จทั้งหมด + งานที่เสร็จล่าสุด DONE_ON_BOARD รายการ
 * กรองตามเครื่อง / ช่าง / ช่วงวันที่เข้าซ่อม (REQ-SRC-03, REQ-BON-08)
 */
export async function getMaintenanceBoard(f: BoardFilter): Promise<{ active: Maintenance[]; done: Maintenance[]; doneTotal: number }> {
  const supabase = await createSupabaseServerClient();

  const build = (done: boolean) => {
    let q = supabase
      .from("maintenance_records")
      .select(MNT_COLUMNS, { count: "exact" })
      .order("maintained_at", { ascending: !done }); // งานค้าง: เก่าสุดขึ้นก่อน / งานเสร็จ: ใหม่สุดขึ้นก่อน
    q = done ? q.eq("status", "Done").limit(DONE_ON_BOARD) : q.neq("status", "Done");
    if (f.machineId && isUuid(f.machineId)) q = q.eq("machine_id", f.machineId);
    if (f.technicianId && isUuid(f.technicianId)) q = q.eq("technician_id", f.technicianId);
    if (f.fromIso) q = q.gte("maintained_at", f.fromIso);
    if (f.toIso) q = q.lt("maintained_at", f.toIso);
    return q;
  };

  const [active, done] = await Promise.all([build(false), build(true)]);
  const err = active.error ?? done.error;
  if (err) {
    console.error(`getMaintenanceBoard failed: code=${err.code ?? "unknown"}`);
    throw new Error("โหลดงานซ่อมบำรุงไม่สำเร็จ");
  }
  return {
    active: (active.data ?? []) as unknown as Maintenance[],
    done: (done.data ?? []) as unknown as Maintenance[],
    doneTotal: done.count ?? 0,
  };
}

export async function getMaintenanceById(id: string): Promise<Maintenance | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("maintenance_records").select(MNT_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    console.error(`getMaintenanceById failed: id=${id}, code=${error.code ?? "unknown"}`);
    throw new Error("โหลดใบงานซ่อมไม่สำเร็จ");
  }
  return (data as unknown as Maintenance | null) ?? null;
}

/** Alarm ที่ยังไม่ปิด ใช้เป็นตัวเลือก "ผูกกับ Alarm" ในฟอร์มเปิดใบงาน */
export async function getOpenAlarmOptions(): Promise<{ id: string; alarm_code: string; machine_id: string; machine_code: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("alarms")
    .select("id, alarm_code, machine_id, machine:machines(machine_id)")
    .neq("status", "Closed")
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error(`getOpenAlarmOptions failed: code=${error.code ?? "unknown"}`);
    return [];
  }
  return ((data ?? []) as unknown as { id: string; alarm_code: string; machine_id: string; machine: { machine_id: string } | null }[]).map(
    (a) => ({ id: a.id, alarm_code: a.alarm_code, machine_id: a.machine_id, machine_code: a.machine?.machine_id ?? "—" }),
  );
}
