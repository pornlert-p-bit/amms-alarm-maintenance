import "server-only";

import { isRole, type Role } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRow = { id: string; full_name: string; role: Role; created_at: string };

/**
 * รายชื่อผู้ใช้ทั้งหมด — อ่านจากตาราง profiles ตรง ๆ (ไม่ใช่ staff_directory)
 * เพราะต้องการ created_at และ RLS profiles_select_self_or_admin ให้ admin เห็นทุกแถวอยู่แล้ว
 * หน้านี้เรียกหลัง requireAdmin() เท่านั้น
 *
 * หมายเหตุ: ไม่มีอีเมล — อีเมลอยู่ใน auth.users ซึ่งอ่านได้ด้วย Secret key เท่านั้น (v1 ไม่ใช้ Secret key)
 */
export async function getUsers(): Promise<UserRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at").order("full_name");
  if (error) {
    console.error(`getUsers failed: code=${error.code ?? "unknown"}`);
    throw new Error("โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
  }
  return (data ?? []).filter((u) => isRole(u.role)) as UserRow[];
}
