"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/features/audit/write";
import { fail, fromDbError, withValues, type FormState } from "@/lib/action-result";
import { authorizeAction } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isUuid } from "./queries";
import { canDeleteMachine } from "./rules";
import { machineSchema } from "./schema";

/**
 * Server Action ของเครื่องจักร — Admin เท่านั้น (REQ-MCH-01, REQ-MCH-06)
 *
 * ด่านตรวจ 3 ชั้น: authorizeAction (ที่นี่) → RLS policy machines_admin_* → Constraint ในฐานข้อมูล
 * ทุก action อ่านค่าจากฟอร์มเฉพาะช่องที่อนุญาต (allow-list) — ไม่รับ created_by / deleted_at จากฟอร์ม
 */

/** ข้อความภาษาไทยเมื่อชน Constraint ของตาราง machines */
const MACHINE_CONSTRAINTS = {
  machines_machine_id_key: {
    field: "machine_id",
    message: "รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ (รวมถึงเครื่องที่เคยถูกลบไปแล้ว)",
  },
  machines_machine_id_format: {
    field: "machine_id",
    message: "รหัสเครื่องจักรต้องเป็นตัวอักษรอังกฤษ ตัวเลข หรือขีด (-) ยาว 2–20 ตัว",
  },
};

/** ช่องที่รับจากฟอร์ม (allow-list) — ช่องอื่นที่ถูกส่งมาจะถูกเมิน */
const MACHINE_FIELDS = ["machine_id", "machine_name", "machine_type", "location", "status"] as const;

function readMachineForm(formData: FormData) {
  return machineSchema.safeParse({
    machine_id: formData.get("machine_id"),
    machine_name: formData.get("machine_name"),
    machine_type: formData.get("machine_type"),
    location: formData.get("location"),
    status: formData.get("status"),
  });
}

function afterMachineChange() {
  revalidatePath("/machines");
  revalidatePath("/dashboard");
}

export async function createMachine(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;

  const parsed = readMachineForm(formData);
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      MACHINE_FIELDS,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("machines")
    .insert({ ...parsed.data, created_by: auth.user.id }) // created_by มาจาก session ไม่ใช่จากฟอร์ม
    .select("id")
    .single();

  if (error || !data) {
    console.warn(`createMachine failed: machine_id=${parsed.data.machine_id}, code=${error?.code ?? "no-row"}`);
    return withValues(fromDbError(error ?? {}, MACHINE_CONSTRAINTS), formData, MACHINE_FIELDS);
  }

  await writeAudit(supabase, auth.user, {
    action: "machine.create",
    entityType: "machine",
    entityId: data.id,
    after: parsed.data,
  });

  afterMachineChange();
  redirect(`/machines?saved=${encodeURIComponent(parsed.data.machine_id)}`);
}

export async function updateMachine(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้");

  const parsed = readMachineForm(formData);
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      MACHINE_FIELDS,
    );
  }

  const supabase = await createSupabaseServerClient();

  // อ่านค่าเดิมไว้เขียน Audit Log (before) — และยืนยันว่ายังไม่ถูกลบ
  const { data: before } = await supabase
    .from("machines")
    .select("machine_id, machine_name, machine_type, location, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้ หรือถูกลบไปแล้ว");

  const { data, error } = await supabase
    .from("machines")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`updateMachine failed: id=${id}, code=${error.code ?? "unknown"}`);
    return withValues(fromDbError(error, MACHINE_CONSTRAINTS), formData, MACHINE_FIELDS);
  }
  // RLS ปฏิเสธแบบเงียบ ๆ จะได้ 0 แถว ไม่ใช่ error — ต้องเช็คเอง
  if (!data) return fail("FORBIDDEN", "บันทึกไม่สำเร็จ: ไม่มีสิทธิ์ หรือไม่พบข้อมูล");

  await writeAudit(supabase, auth.user, {
    action: "machine.update",
    entityType: "machine",
    entityId: id,
    before,
    after: parsed.data,
  });

  afterMachineChange();
  redirect(`/machines?saved=${encodeURIComponent(parsed.data.machine_id)}`);
}

/** ลบแบบ Soft Delete: ใส่เวลาใน deleted_at แทนการลบแถวจริง (REQ-MCH-05, BR-06) */
export async function softDeleteMachine(id: string): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้");

  const supabase = await createSupabaseServerClient();

  const { data: machine } = await supabase
    .from("machines")
    .select("machine_id, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!machine) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้ หรือถูกลบไปแล้ว");

  // BR-05: ห้ามลบเครื่องที่ยังมี Alarm ค้าง
  const { count, error: countError } = await supabase
    .from("alarms")
    .select("id", { count: "exact", head: true })
    .eq("machine_id", id)
    .neq("status", "Closed");
  if (countError) return fromDbError(countError);

  const check = canDeleteMachine({ openAlarms: count ?? 0 });
  if (!check.ok) return fail("VALIDATION", check.reason);

  const { data, error } = await supabase
    .from("machines")
    .update({ deleted_at: new Date().toISOString() }) // เวลาจาก server ไม่ใช่จาก browser
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return fromDbError(error);
  if (!data) return fail("FORBIDDEN", "ลบไม่สำเร็จ: ไม่มีสิทธิ์ หรือไม่พบข้อมูล");

  await writeAudit(supabase, auth.user, {
    action: "machine.soft_delete",
    entityType: "machine",
    entityId: id,
    before: machine,
  });

  afterMachineChange();
  redirect(`/machines?deleted=${encodeURIComponent(machine.machine_id)}`);
}
