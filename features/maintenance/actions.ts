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

import { allowedMntTransition } from "./rules";
import { MNT_STATUSES, mntCreateSchema, mntDoneSchema, mntEditSchema, type MntStatus } from "./schema";

/**
 * Server Action ของงานซ่อมบำรุง — Admin และ Technician (REQ-MNT-01…05)
 * ด่านตรวจ: authorizeAction(isStaff) → RLS mnt_staff_* → CHECK + trigger (migration 005)
 */

const MNT_CONSTRAINTS = {
  mnt_done_requires_action: { field: "action_taken", message: "กรุณาบันทึกการแก้ไขก่อนปิดงาน" },
  "alarm does not belong to this machine": { field: "alarm_id", message: "Alarm ที่เลือกไม่ใช่ของเครื่องจักรนี้" },
  "technician must be admin or technician": { field: "technician_id", message: "ผู้รับผิดชอบต้องเป็นช่างหรือผู้ดูแลระบบ" },
  "invalid maintenance status transition": { message: "เปลี่ยนสถานะตามลำดับนี้ไม่ได้" },
  "completed maintenance cannot be modified": { message: "ใบงานนี้เสร็จแล้ว แก้ไขไม่ได้" },
  maintenance_records_machine_id_fkey: { field: "machine_id", message: "ไม่พบเครื่องจักรที่เลือก" },
  maintenance_records_technician_id_fkey: { field: "technician_id", message: "ไม่พบช่างที่เลือก" },
};

const CREATE_FIELDS = ["machine_id", "alarm_id", "technician_id", "problem", "maintained_at"] as const;
const EDIT_FIELDS = ["technician_id", "problem", "maintained_at"] as const;

function afterMntChange(id?: string) {
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/maintenance/${id}`);
}

export async function createMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;

  const parsed = mntCreateSchema.safeParse({
    machine_id: formData.get("machine_id"),
    alarm_id: formData.get("alarm_id"),
    technician_id: formData.get("technician_id"),
    problem: formData.get("problem"),
    maintained_at: formData.get("maintained_at"),
  });
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      CREATE_FIELDS,
    );
  }

  const supabase = await createSupabaseServerClient();

  // เครื่องต้องยังไม่ถูกลบ (trigger ตรวจว่า Alarm เป็นของเครื่องเดียวกันอยู่แล้ว)
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
      CREATE_FIELDS,
    );
  }

  const { data, error } = await supabase
    .from("maintenance_records")
    .insert({ ...parsed.data, status: "Open", created_by: auth.user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.warn(`createMaintenance failed: machine=${machine.machine_id}, code=${error?.code ?? "no-row"}`);
    return withValues(fromDbError(error ?? {}, MNT_CONSTRAINTS), formData, CREATE_FIELDS);
  }

  await writeAudit(supabase, auth.user, {
    action: "maintenance.create",
    entityType: "maintenance",
    entityId: data.id,
    after: { ...parsed.data, machine: machine.machine_id, status: "Open" },
  });

  afterMntChange();
  redirect(`/maintenance/${data.id}?created=1`);
}

/** เปลี่ยนสถานะใบงาน — ถ้าเป็น Done ต้องมีผลการแก้ไข (action_taken) */
export async function changeMaintenanceStatus(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบใบงานนี้");

  const to = formData.get("to");
  if (typeof to !== "string" || !(MNT_STATUSES as readonly string[]).includes(to)) {
    return fail("VALIDATION", "สถานะที่ต้องการเปลี่ยนไม่ถูกต้อง");
  }
  const target = to as MntStatus;

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("maintenance_records").select("status").eq("id", id).maybeSingle();
  if (!current) return fail("NOT_FOUND", "ไม่พบใบงานนี้");

  const from = current.status as MntStatus;
  if (!allowedMntTransition(from, target)) {
    return fail("INVALID_TRANSITION", `เปลี่ยนสถานะจาก ${from} เป็น ${target} ไม่ได้`);
  }

  let patch: Record<string, unknown> = { status: target };
  if (target === "Done") {
    const parsed = mntDoneSchema.safeParse({ action_taken: formData.get("action_taken") });
    if (!parsed.success) {
      return withValues(
        fail("VALIDATION", "กรุณาบันทึกการแก้ไขก่อนปิดงาน", z.flattenError(parsed.error).fieldErrors),
        formData,
        ["action_taken"],
      );
    }
    patch = { status: target, action_taken: parsed.data.action_taken };
  }

  // .eq("status", from) = กันสองคนกดพร้อมกันแล้วเขียนทับกัน
  const { data, error } = await supabase
    .from("maintenance_records")
    .update(patch)
    .eq("id", id)
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`changeMaintenanceStatus failed: id=${id}, ${from}->${target}, code=${error.code ?? "unknown"}`);
    return withValues(fromDbError(error, MNT_CONSTRAINTS), formData, ["action_taken"]);
  }
  if (!data) return fail("INVALID_TRANSITION", "ใบงานนี้ถูกเปลี่ยนสถานะไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");

  await writeAudit(supabase, auth.user, {
    action: `maintenance.${target === "Done" ? "complete" : target === "Waiting Part" ? "wait_part" : "start"}`,
    entityType: "maintenance",
    entityId: id,
    before: { status: from },
    after: patch,
  });

  afterMntChange(id);
  // กดจากบอร์ดให้กลับไปบอร์ด กดจากหน้ารายละเอียดให้กลับหน้ารายละเอียด
  redirect(formData.get("back") === "board" ? "/maintenance" : `/maintenance/${id}?updated=1`);
}

/** แก้ช่างผู้รับผิดชอบ / ปัญหา / วันเวลาเข้าซ่อม ระหว่างที่ใบงานยังไม่เสร็จ */
export async function updateMaintenanceDetails(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorizeAction(isStaff);
  if (!auth.ok) return auth;
  if (!isUuid(id)) return fail("NOT_FOUND", "ไม่พบใบงานนี้");

  const parsed = mntEditSchema.safeParse({
    technician_id: formData.get("technician_id"),
    problem: formData.get("problem"),
    maintained_at: formData.get("maintained_at"),
  });
  if (!parsed.success) {
    return withValues(
      fail("VALIDATION", "กรุณาตรวจสอบข้อมูลที่กรอก", z.flattenError(parsed.error).fieldErrors),
      formData,
      EDIT_FIELDS,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("maintenance_records")
    .select("technician_id, problem, maintained_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!before) return fail("NOT_FOUND", "ไม่พบใบงานนี้");
  if (before.status === "Done") return fail("INVALID_TRANSITION", "ใบงานนี้เสร็จแล้ว แก้ไขไม่ได้");

  const { data, error } = await supabase
    .from("maintenance_records")
    .update(parsed.data)
    .eq("id", id)
    .neq("status", "Done")
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn(`updateMaintenanceDetails failed: id=${id}, code=${error.code ?? "unknown"}`);
    return withValues(fromDbError(error, MNT_CONSTRAINTS), formData, EDIT_FIELDS);
  }
  if (!data) return fail("INVALID_TRANSITION", "แก้ไขไม่สำเร็จ: ใบงานอาจเสร็จไปแล้ว กรุณารีเฟรช");

  await writeAudit(supabase, auth.user, {
    action: "maintenance.update",
    entityType: "maintenance",
    entityId: id,
    before: { technician_id: before.technician_id, problem: before.problem, maintained_at: before.maintained_at },
    after: parsed.data,
  });

  afterMntChange(id);
  redirect(`/maintenance/${id}?updated=1`);
}
