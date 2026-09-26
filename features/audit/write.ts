import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurrentUser } from "@/lib/auth/dal";

/**
 * เขียน Audit Log — จุดเดียวที่ Server Action ทุกตัวใช้ (ADR-005)
 *
 * action ใช้รูปแบบ "<entity>.<การกระทำ>" เช่น machine.create, alarm.close
 * before/after เก็บเฉพาะ field ที่เกี่ยวข้อง ไม่ต้อง dump ทั้งแถว
 *
 * ข้อจำกัดที่รู้อยู่ (บันทึกใน ADR-005 ส่วน Revision):
 * การเรียกผ่าน Supabase Data API ทำทีละคำสั่ง จึงไม่ได้อยู่ใน transaction เดียวกับการแก้ข้อมูล
 * ถ้าเขียน log ไม่สำเร็จ ข้อมูลที่แก้แล้วจะไม่ถูกย้อนกลับ — ฟังก์ชันนี้จะเขียน error พร้อม context ลง server log
 * เพื่อให้ตามแก้ได้ และไม่ทำให้ผู้ใช้เห็นว่าการบันทึกล้มเหลวทั้งที่ข้อมูลเข้าไปแล้ว
 */
export async function writeAudit(
  supabase: SupabaseClient,
  actor: CurrentUser,
  entry: {
    action: string;
    entityType: "machine" | "alarm" | "maintenance" | "profile";
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actor.id, // RLS บังคับว่าต้องเป็นตัวเองเท่านั้น (policy audit_self_insert)
    actor_role: actor.role,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    before_data: entry.before ?? null,
    after_data: entry.after ?? null,
  });

  if (error) {
    console.error(
      `writeAudit failed: action=${entry.action}, entity=${entry.entityType}:${entry.entityId}, ` +
        `actor=${actor.id}, code=${error.code ?? "unknown"}`,
    );
  }
}
