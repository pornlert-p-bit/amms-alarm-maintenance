import "server-only";

import type { Role } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * อ่านรายชื่อผู้ใช้จาก view staff_directory (id, ชื่อ, role เท่านั้น — migration 002)
 * ใช้แสดงชื่อ "ผู้บันทึก / ผู้ปิด" และเลือกช่างในงานซ่อม
 */
export type StaffEntry = { id: string; full_name: string; role: Role };

export async function getStaffDirectory(): Promise<StaffEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("staff_directory").select("id, full_name, role").order("full_name");

  if (error) {
    // ถ้ายังไม่ได้รัน migration 002 หน้าเว็บยังใช้งานได้ แค่แสดงชื่อไม่ได้ (Graceful Failure — 02 §6.1)
    console.warn(`getStaffDirectory failed: code=${error.code ?? "unknown"} (รัน supabase/migrations/002 แล้วหรือยัง?)`);
    return [];
  }
  return (data ?? []) as StaffEntry[];
}

/** แปลง id เป็นชื่อ — ถ้าไม่รู้จักแสดง "—" */
export function staffNameOf(staff: StaffEntry[], id: string | null | undefined): string {
  if (!id) return "—";
  return staff.find((s) => s.id === id)?.full_name ?? "—";
}
