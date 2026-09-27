"use server";

import { revalidatePath } from "next/cache";

import { writeAudit } from "@/features/audit/write";
import { isUuid } from "@/features/machine/queries";
import { fail, type FormState } from "@/lib/action-result";
import { authorizeAction } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isSimStatus, pickFault } from "./faults";

/**
 * Server Action ของ PLC Simulator — Admin เท่านั้น (ADR-004, REQ-BON-09)
 * ด่านตรวจ: authorizeAction(isAdmin) → ฟังก์ชันในฐานข้อมูลตรวจ admin ซ้ำ + RLS (migration 009)
 *
 * สัญญาณจำลองไม่ได้แก้ตารางตรง แต่เรียกฟังก์ชันในฐานข้อมูล ซึ่งเป็นเส้นทางเดียวกับที่ PLC Gateway จะใช้ใน v2
 * ประวัติสถานะเครื่องจึงถูกบันทึกว่ามาจาก "simulator" ไม่ใช่ "manual"
 */

function afterSimulate(machineId: string) {
  revalidatePath("/simulator");
  revalidatePath("/dashboard");
  revalidatePath("/machines");
  revalidatePath(`/machines/${machineId}`);
  revalidatePath("/alarms");
}

/** แปลง error จากฟังก์ชันในฐานข้อมูลเป็นข้อความไทย */
function simError(code: string | undefined): FormState {
  if (code === "42501") return fail("FORBIDDEN", "Simulator ใช้ได้เฉพาะผู้ดูแลระบบ");
  if (code === "P0002") return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้ หรือถูกลบไปแล้ว");
  if (code === "PGRST202") return fail("SERVER_ERROR", "ยังไม่ได้รัน migration 009 (ดู RUNBOOK ข้อ 2.6)");
  return fail("SERVER_ERROR", "ส่งสัญญาณจำลองไม่สำเร็จ กรุณาลองใหม่");
}

export async function simulateStatus(machineId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;
  if (!isUuid(machineId)) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้");

  const to = formData.get("to");
  if (!isSimStatus(to)) return fail("VALIDATION", "สถานะที่จำลองไม่ถูกต้อง");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("machines").select("machine_id, status").eq("id", machineId).maybeSingle();

  const { error } = await supabase.rpc("simulate_machine_status", { p_machine: machineId, p_status: to });
  if (error) {
    console.warn(`simulateStatus failed: machine=${machineId}, code=${error.code ?? "unknown"}`);
    return simError(error.code);
  }

  await writeAudit(supabase, auth.user, {
    action: "machine.simulate_status",
    entityType: "machine",
    entityId: machineId,
    before: before ? { status: before.status } : null,
    after: { status: to, source: "simulator" },
  });

  afterSimulate(machineId);
  const code = { Running: "RUN", Stop: "STOP", Maintenance: "MAINT" }[to];
  return { ok: true, data: null, message: `ส่งสัญญาณ ${code} แล้ว` };
}

export async function simulateFault(machineId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorizeAction(isAdmin);
  if (!auth.ok) return auth;
  if (!isUuid(machineId)) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้");

  const supabase = await createSupabaseServerClient();
  const { data: machine } = await supabase
    .from("machines")
    .select("machine_id, machine_type, status")
    .eq("id", machineId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!machine) return fail("NOT_FOUND", "ไม่พบเครื่องจักรนี้ หรือถูกลบไปแล้ว");

  // server เลือกรหัส/ข้อความเองจากรายการสำเร็จรูป หน้าเว็บส่งมาแค่ลำดับ
  const fault = pickFault(machine.machine_type, formData.get("fault"));
  if (!fault) return fail("VALIDATION", "กรุณาเลือก Fault จากรายการ");

  const { data: alarmId, error } = await supabase.rpc("simulate_machine_fault", {
    p_machine: machineId,
    p_code: fault.code,
    p_description: fault.description,
  });
  if (error || typeof alarmId !== "string") {
    console.warn(`simulateFault failed: machine=${machine.machine_id}, code=${error?.code ?? "no-id"}`);
    return simError(error?.code);
  }

  await writeAudit(supabase, auth.user, {
    action: "alarm.simulate_fault",
    entityType: "alarm",
    entityId: alarmId,
    before: { machine_status: machine.status },
    after: { alarm_code: fault.code, machine_status: "Alarm", source: "simulator" },
  });

  afterSimulate(machineId);
  return { ok: true, data: null, message: `เกิด Alarm ${fault.code} แล้ว` };
}
