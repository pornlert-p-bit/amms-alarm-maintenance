import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { MachineStatus } from "./schema";

/**
 * การอ่านข้อมูลเครื่องจักร — เรียกจาก Server Component เท่านั้น
 * ทุก query กรองเครื่องที่ถูก Soft Delete ออก (BR-06) และใช้ pagination (NFR-PERF-02)
 */

export const MACHINE_PAGE_SIZE = 25;

export type Machine = {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
  updated_at: string;
};

const MACHINE_COLUMNS = "id, machine_id, machine_name, machine_type, location, status, updated_at";

/** uuid ที่ถูกรูปแบบ — ตรวจก่อนส่งให้ฐานข้อมูล กัน error จากค่าที่ผู้ใช้แก้ใน URL */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getMachines(params: {
  search: string; // ต้องผ่าน sanitizeSearch() มาแล้ว
  status: MachineStatus | null;
  page: number;
}): Promise<{ rows: Machine[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (params.page - 1) * MACHINE_PAGE_SIZE;

  let query = supabase
    .from("machines")
    .select(MACHINE_COLUMNS, { count: "exact" })
    .is("deleted_at", null)
    .order("machine_id")
    .range(from, from + MACHINE_PAGE_SIZE - 1);

  if (params.search) {
    // ค้นได้ทั้งรหัสและชื่อ (REQ-SRC-01) — ครอบค่าด้วย " เพื่อรองรับคำค้นที่มีช่องว่าง
    const s = params.search;
    query = query.or(`machine_id.ilike."%${s}%",machine_name.ilike."%${s}%"`);
  }
  if (params.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) {
    console.error(`getMachines failed: code=${error.code ?? "unknown"}`);
    throw new Error("โหลดรายการเครื่องจักรไม่สำเร็จ");
  }
  return { rows: (data ?? []) as Machine[], total: count ?? 0 };
}

export async function getMachineById(id: string): Promise<Machine | null> {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("machines")
    .select(MACHINE_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error(`getMachineById failed: id=${id}, code=${error.code ?? "unknown"}`);
    throw new Error("โหลดข้อมูลเครื่องจักรไม่สำเร็จ");
  }
  return (data as Machine | null) ?? null;
}

/** รายการเครื่องสำหรับช่องเลือกในฟอร์มอื่น (เช่น ฟอร์ม Alarm) */
export async function getMachineOptions(): Promise<Pick<Machine, "id" | "machine_id" | "machine_name">[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("machines")
    .select("id, machine_id, machine_name")
    .is("deleted_at", null)
    .order("machine_id");
  if (error) {
    console.error(`getMachineOptions failed: code=${error.code ?? "unknown"}`);
    throw new Error("โหลดรายการเครื่องจักรไม่สำเร็จ");
  }
  return data ?? [];
}
