import "server-only";

import { isUuid } from "@/features/machine/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AlarmStatus } from "./schema";

/** การอ่านข้อมูล Alarm — เรียกจาก Server Component เท่านั้น */

export const ALARM_PAGE_SIZE = 25;

export type Alarm = {
  id: string;
  alarm_code: string;
  description: string;
  cause: string | null;
  occurred_at: string;
  status: AlarmStatus;
  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  updated_at: string;
  machine: { id: string; machine_id: string; machine_name: string; deleted_at: string | null } | null;
};

// machine:machines(...) = ดึงข้อมูลเครื่องมาด้วยในคำสั่งเดียวผ่าน Foreign Key (ไม่ต้อง query แยก)
const ALARM_COLUMNS =
  "id, alarm_code, description, cause, occurred_at, status, created_by, closed_by, closed_at, updated_at, " +
  "machine:machines(id, machine_id, machine_name, deleted_at)";

export async function getAlarms(params: {
  machineId: string | null;
  status: AlarmStatus | null;
  code: string; // ต้องผ่าน sanitizeSearch() มาแล้ว
  fromIso: string | null;
  toIso: string | null;
  page: number;
}): Promise<{ rows: Alarm[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (params.page - 1) * ALARM_PAGE_SIZE;

  let query = supabase
    .from("alarms")
    .select(ALARM_COLUMNS, { count: "exact" })
    .order("occurred_at", { ascending: false })
    .range(from, from + ALARM_PAGE_SIZE - 1);

  if (params.machineId && isUuid(params.machineId)) query = query.eq("machine_id", params.machineId);
  if (params.status) query = query.eq("status", params.status);
  if (params.code) query = query.ilike("alarm_code", `%${params.code}%`);
  if (params.fromIso) query = query.gte("occurred_at", params.fromIso);
  if (params.toIso) query = query.lt("occurred_at", params.toIso);

  const { data, error, count } = await query;
  if (error) {
    console.error(`getAlarms failed: code=${error.code ?? "unknown"}`);
    throw new Error("โหลดรายการ Alarm ไม่สำเร็จ");
  }
  return { rows: (data ?? []) as unknown as Alarm[], total: count ?? 0 };
}

export async function getAlarmById(id: string): Promise<Alarm | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("alarms").select(ALARM_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    console.error(`getAlarmById failed: id=${id}, code=${error.code ?? "unknown"}`);
    throw new Error("โหลดข้อมูล Alarm ไม่สำเร็จ");
  }
  return (data as unknown as Alarm | null) ?? null;
}
