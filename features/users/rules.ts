import type { Role } from "@/lib/auth/roles";

/**
 * กฎการเปลี่ยน Role — ฟังก์ชันบริสุทธิ์ เขียน unit test ได้
 * ฐานข้อมูลบังคับซ้ำอีกชั้น: RLS profiles_admin_update_others (ห้ามแก้แถวตัวเอง)
 * และ migration 007 (แก้ได้แค่คอลัมน์ role)
 */
export function checkRoleChange(input: { actorId: string; targetId: string; from: Role; to: Role }):
  | { ok: true }
  | { ok: false; reason: string } {
  // REQ-AUTH-06 / BR-07: กันผู้ดูแลลดสิทธิ์ตัวเองจนไม่มีใครเป็น admin และกันการยกระดับตัวเอง
  if (input.actorId === input.targetId) {
    return { ok: false, reason: "เปลี่ยน Role ของตัวเองไม่ได้ — ให้ผู้ดูแลระบบคนอื่นเป็นคนเปลี่ยน" };
  }
  if (input.from === input.to) {
    return { ok: false, reason: "Role ที่เลือกเป็นค่าเดิมอยู่แล้ว" };
  }
  return { ok: true };
}
