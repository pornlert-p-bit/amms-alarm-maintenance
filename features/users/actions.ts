"use server";

import { revalidatePath } from "next/cache";

import { writeAudit } from "@/features/audit/write";
import { isUuid } from "@/features/machine/queries";
import { fail, type FormState } from "@/lib/action-result";
import { authorizeAction } from "@/lib/auth/dal";
import { isAdmin, isRole, ROLE_LABEL } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { checkRoleChange } from "./rules";

/**
 * เปลี่ยน Role ของผู้ใช้คนอื่น — Admin เท่านั้น (REQ-AUTH-05, REQ-AUTH-06)
 * ด่านตรวจ: authorizeAction(isAdmin) → checkRoleChange → RLS (ห้ามแถวตัวเอง) → สิทธิ์คอลัมน์ (migration 007)
 *
 * ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ (สิทธิ์การเข้าถึง)
 *
 * สำเร็จแล้วไม่ redirect — คืนข้อความให้แถวนั้นแสดงผล และ revalidate ให้ตารางอ่านค่าใหม่
 * ผู้ใช้ที่ถูกเปลี่ยน Role จะได้สิทธิ์ใหม่ทันทีในคำขอถัดไป เพราะ DAL อ่าน Role จากฐานข้อมูลทุกครั้ง
 */
export async function changeUserRole(targetId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;
  if (!isUuid(targetId)) return fail("NOT_FOUND", "ไม่พบผู้ใช้นี้");

  const to = formData.get("role");
  if (!isRole(to)) return fail("VALIDATION", "Role ที่เลือกไม่ถูกต้อง");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (!before || !isRole(before.role)) return fail("NOT_FOUND", "ไม่พบผู้ใช้นี้");

  const check = checkRoleChange({ actorId: auth.user.id, targetId, from: before.role, to });
  if (!check.ok) return fail("FORBIDDEN", check.reason);

  // .eq("role", before.role) = กันผู้ดูแลสองคนแก้คนเดียวกันพร้อมกันแล้วเขียนทับ
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: to })
    .eq("id", targetId)
    .eq("role", before.role)
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`changeUserRole failed: target=${targetId}, code=${error.code ?? "unknown"}`);
    return fail("SERVER_ERROR", "เปลี่ยน Role ไม่สำเร็จ กรุณาลองใหม่");
  }
  if (!data) return fail("CONFLICT", "Role ของผู้ใช้นี้ถูกเปลี่ยนไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");

  await writeAudit(supabase, auth.user, {
    action: "user.role_change",
    entityType: "profile",
    entityId: targetId,
    before: { role: before.role },
    after: { role: to },
  });

  revalidatePath("/users");
  return { ok: true, data: null, message: `เปลี่ยนเป็น ${ROLE_LABEL[to]} แล้ว` };
}
