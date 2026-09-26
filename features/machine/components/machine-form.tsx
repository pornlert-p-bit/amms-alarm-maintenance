"use client";

import Link from "next/link";
import { useActionState } from "react";

import { buttonClass, FieldShell, inputClass, Notice } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

import { MACHINE_STATUS_LABEL } from "../rules";
import { MACHINE_STATUSES, type MachineStatus } from "../schema";

type Values = {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
};

type Props = {
  /** Server Action ที่จะเรียก (createMachine หรือ updateMachine ที่ผูก id ไว้แล้ว) */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Values;
  submitLabel: string;
};

/**
 * ฟอร์มเพิ่ม/แก้ไขเครื่องจักร
 * ตรวจข้อมูลจริงที่ server — ฟอร์มนี้แค่รับค่าและแสดงผล
 * ถ้าบันทึกไม่สำเร็จ ค่าที่กรอกไว้จะยังอยู่ครบ (NFR-USE-01) เพราะ server ส่งค่าที่กรอกกลับมาใน state.values
 */
export function MachineForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = (name: keyof Values) => errors[name]?.[0];
  // ค่าที่แสดงในช่อง: ค่าที่เพิ่งกรอก (ถ้าบันทึกไม่ผ่าน) > ค่าเดิมของเครื่อง > ว่าง
  const val = (name: keyof Values) => (state && !state.ok ? state.values?.[name] : undefined) ?? defaults?.[name];

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state && !state.ok && <Notice tone="bad">{state.message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell id="machine_id" label="รหัสเครื่องจักร" required error={err("machine_id")}
          hint="ตัวอักษรอังกฤษ ตัวเลข หรือขีด (-) 2–20 ตัว เช่น M-001 ระบบจะแปลงเป็นตัวพิมพ์ใหญ่ให้">
          <input id="machine_id" name="machine_id" defaultValue={val("machine_id")} maxLength={20}
            autoComplete="off" aria-invalid={Boolean(err("machine_id"))}
            aria-describedby={err("machine_id") ? "machine_id-error" : undefined}
            className={inputClass(Boolean(err("machine_id")), "font-mono uppercase")} />
        </FieldShell>

        <FieldShell id="status" label="สถานะ" required error={err("status")}>
          {/* key: <select> ไม่รับค่า defaultValue ใหม่หลังแสดงผลแล้ว — เปลี่ยน key เพื่อให้ React สร้างช่องใหม่
              ไม่งั้นหลังบันทึกไม่ผ่าน React 19 ล้างฟอร์มแล้วช่องนี้จะเด้งกลับไปค่าแรกเสมอ */}
          <select key={`status-${val("status") ?? "Running"}`} id="status" name="status" defaultValue={val("status") ?? "Running"}
            aria-invalid={Boolean(err("status"))} className={inputClass(Boolean(err("status")))}>
            {MACHINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} — {MACHINE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FieldShell>

        <FieldShell id="machine_name" label="ชื่อเครื่องจักร" required error={err("machine_name")}>
          <input id="machine_name" name="machine_name" defaultValue={val("machine_name")} maxLength={100}
            aria-invalid={Boolean(err("machine_name"))} className={inputClass(Boolean(err("machine_name")))} />
        </FieldShell>

        <FieldShell id="machine_type" label="ประเภทเครื่องจักร" required error={err("machine_type")}
          hint="เช่น CNC, Injection Molding, Conveyor, Robot">
          <input id="machine_type" name="machine_type" defaultValue={val("machine_type")} maxLength={50}
            aria-invalid={Boolean(err("machine_type"))} className={inputClass(Boolean(err("machine_type")))} />
        </FieldShell>

        <FieldShell id="location" label="ตำแหน่ง / ไลน์ผลิต" required error={err("location")}
          hint="ใช้จัดกลุ่มในผังโรงงานหน้าภาพรวม เช่น Line A">
          <input id="location" name="location" defaultValue={val("location")} maxLength={100}
            aria-invalid={Boolean(err("location"))} className={inputClass(Boolean(err("location")))} />
        </FieldShell>
      </div>

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "กำลังบันทึก…" : submitLabel}
        </button>
        <Link href="/machines" className={buttonClass.secondary}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
