"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/features/audit/write";
import { isUuid } from "@/features/machine/queries";
import { fail, fromDbError, withValues, type FormState } from "@/lib/action-result";
import { authorizeAction } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { allowedAlarmTransition } from "./rules";
import { ALARM_STATUSES, alarmCloseSchema, alarmCreateSchema, alarmEditSchema, type AlarmStatus } from "./schema";

/**
 * Server Action ของ Alarm — Admin และ Technician (REQ-ALM-01…05)
 * ด่านตรวจ: authorizeAction(isStaff) → RLS alarms_staff_* → CHECK/Trigger ในฐานข้อมูล
 *
 * หมายเหตุการออกแบบ: บันทึก/ปิด Alarm "ไม่ได้" เปลี่ยนสถานะเครื่องจักรอัตโนมัติ
 * เพราะสถานะเครื่องเป็นข้อมูลหลักที่ Admin (หรือ PLC ใน v2) เป็นเจ้าของ — Source of Truth ใน 03 §7, BR-09
 */

const ALARM_FIELDS = ["machine_id", "alarm_code", "description", "occurred_at"] as const;

const ALARM_CONSTRAINTS = {
  // ข้อความจาก trigger check_occurred_at_not_future ใน schema.sql
  "occurred_at must not be in the future": {
    field: "occurred_at",
    message: "วันเวลาที่เกิด Alarm ต้องไม่เป็นเวลาในอนาคต",
  },
  alarms_machine_id_fkey: { field: "machine_id", message: "ไม่พบเครื่องจักรที่เลือก" },
  alarms_closed_requires_cause: { field: "cause", message: "กรุณาระบุสาเหตุก่อนปิด Alarm" },
  // ข้อความจาก trigger enforce_alarm_update (migration 003)
  "invalid alarm status transition": { message: "เปลี่ยนสถานะตามลำดับนี้ไม่ได้" },
  "closed alarm cannot be modified": { message: "Alarm นี้ปิดแล้ว แก้ไขไม่ได้" },
};

function afterAlarmChange(alarmId?: string) {
  revalidatePath("/alarms");
  revalidatePath("/dashboard");
  if (alarmId) revalidatePath(`/alarms/${alarmId}`);
}

export async function createAlarm(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;

  const parsed = alarmCreateSchema.safeParse({
    machine_id: formData.get("machine_id"),
    alarm_code: formData.get("alarm_code"),
    description: formData.get("description"),
    occurred_at: formData.get("occurred_at"),
  });
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      ALARM_FIELDS,
    );
  }

  const supabase = await createSupabaseServerClient();

  // เครื่องต้องมีอยู่และยังไม่ถูกลบ (FK กันเครื่องที่ไม่มีจริงได้ แต่กันเครื่องที่ถูก Soft Delete ไม่ได้)
  const { data: machine } = await supabase
    .from("machines")
    .select("machine_id")
    .eq("id", parsed.data.machine_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!machine) {
    return withValues(
      fail("VALIDATION", "ไม่พบเครื่องจักรที่เลือก หรือถูกลบไปแล้ว", { machine_id: ["ไม่พบเครื่องจักรที่เลือก"] }),
      formData,
      ALARM_FIELDS,
    );
  }

  const { data, error } = await supabase
    .from("alarms")
    .insert({ ...parsed.data, status: "Open", created_by: auth.user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.warn(`createAlarm failed: machine=${machine.machine_id}, code=${error?.code ?? "no-row"}`);
    return withValues(fromDbError(error ?? {}, ALARM_CONSTRAINTS), formData, ALARM_FIELDS);
  }

  await writeAudit(supabase, auth.user, {
    action: "alarm.create",
    entityType: "alarm",
    entityId: data.id,
    after: { ...parsed.data, machine: machine.machine_id, status: "Open" },
  });

  afterAlarmChange();
  redirect(`/alarms/${data.id}?created=1`);
}

/**
 * เปลี่ยนสถานะ Alarm: รับงาน (→ In Progress) หรือปิด (→ Closed พร้อมสาเหตุ)
 * ค่า "to" มาจากปุ่มที่กด — ตรวจกับสถานะปัจจุบันในฐานข้อมูลเสมอ ไม่เชื่อค่าจากหน้าเว็บ
 */
export async function changeAlarmStatus(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบ Alarm นี้");

  const to = formData.get("to");
  if (typeof to !== "string" || !(ALARM_STATUSES as readonly string[]).includes(to)) {
    return fail("VALIDATION", "สถานะที่ต้องการเปลี่ยนไม่ถูกต้อง");
  }
  const target = to as AlarmStatus;

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("alarms")
    .select("status, cause")
    .eq("id", id)
    .maybeSingle();
  if (!current) return fail("NOT_FOUND", "ไม่พบ Alarm นี้");

  const from = current.status as AlarmStatus;
  if (!allowedAlarmTransition(from, target)) {
    return fail("INVALID_TRANSITION", `เปลี่ยนสถานะจาก ${from} เป็น ${target} ไม่ได้`);
  }

  // สร้างข้อมูลที่จะอัปเดต — ผู้ปิดและเวลาปิดมาจาก server เท่านั้น (REQ-ALM-04)
  // ชั้นฐานข้อมูลก็บังคับซ้ำ: trigger trg_alarms_enforce_update เขียนทับ closed_by/closed_at จาก token เสมอ
  // และตรวจลำดับสถานะอีกรอบ (migration 003) — กันกรณีมีคนข้าม Server Action ไปยิง Data API ตรง
  let patch: Record<string, unknown> = { status: target };
  if (target === "Closed") {
    const parsed = alarmCloseSchema.safeParse({ cause: formData.get("cause") });
    if (!parsed.success) {
      return withValues(
        fail("VALIDATION", "กรุณาระบุสาเหตุก่อนปิด Alarm", z.flattenError(parsed.error).fieldErrors),
        formData,
        ["cause"],
      );
    }
    patch = {
      status: target,
      cause: parsed.data.cause,
      closed_by: auth.user.id,
      closed_at: new Date().toISOString(),
    };
  }

  // .eq("status", from) = อัปเดตเฉพาะเมื่อสถานะยังเป็นค่าที่เราอ่านมา
  // ถ้าช่าง 2 คนกดพร้อมกัน คนที่สองจะได้ 0 แถว แทนที่จะเขียนทับกัน (กันกดซ้ำ — FM-02)
  const { data, error } = await supabase
    .from("alarms")
    .update(patch)
    .eq("id", id)
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`changeAlarmStatus failed: id=${id}, ${from}->${target}, code=${error.code ?? "unknown"}`);
    return withValues(fromDbError(error, ALARM_CONSTRAINTS), formData, ["cause"]);
  }
  if (!data) {
    return fail("INVALID_TRANSITION", "Alarm นี้ถูกเปลี่ยนสถานะไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");
  }

  await writeAudit(supabase, auth.user, {
    action: target === "Closed" ? "alarm.close" : "alarm.start",
    entityType: "alarm",
    entityId: id,
    before: { status: from },
    after: target === "Closed" ? { status: target, cause: patch.cause } : { status: target },
  });

  afterAlarmChange(id);
  redirect(`/alarms/${id}?updated=${target === "Closed" ? "closed" : "started"}`);
}

/** แก้รายละเอียด Alarm (รหัส / รายละเอียด / เวลาเกิด) ระหว่างที่ยังไม่ปิด — REQ-ALM ข้อ "Update" */
export async function updateAlarmDetails(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบ Alarm นี้");

  const fields = ["alarm_code", "description", "occurred_at"] as const;
  const parsed = alarmEditSchema.safeParse({
    alarm_code: formData.get("alarm_code"),
    description: formData.get("description"),
    occurred_at: formData.get("occurred_at"),
  });
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      fields,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("alarms")
    .select("alarm_code, description, occurred_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!before) return fail("NOT_FOUND", "ไม่พบ Alarm นี้");
  if (before.status === "Closed") return fail("INVALID_TRANSITION", "Alarm นี้ปิดแล้ว แก้ไขไม่ได้");

  const { data, error } = await supabase
    .from("alarms")
    .update(parsed.data)
    .eq("id", id)
    .neq("status", "Closed")
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`updateAlarmDetails failed: id=${id}, code=${error.code ?? "unknown"}`);
    return withValues(fromDbError(error, ALARM_CONSTRAINTS), formData, fields);
  }
  if (!data) return fail("INVALID_TRANSITION", "แก้ไขไม่สำเร็จ: Alarm อาจถูกปิดไปแล้ว กรุณารีเฟรช");

  await writeAudit(supabase, auth.user, {
    action: "alarm.update",
    entityType: "alarm",
    entityId: id,
    before: { alarm_code: before.alarm_code, description: before.description, occurred_at: before.occurred_at },
    after: parsed.data,
  });

  afterAlarmChange(id);
  redirect(`/alarms/${id}?updated=edited`);
}
