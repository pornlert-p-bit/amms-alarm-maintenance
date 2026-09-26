"use client";

import Link from "next/link";
import { useActionState } from "react";

import { buttonClass, FieldShell, inputClass, Notice } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

type MachineOption = { id: string; machine_id: string; machine_name: string };

type Props =
  | {
      mode: "create";
      action: (prev: FormState, formData: FormData) => Promise<FormState>;
      machines: MachineOption[];
      nowLocal: string;
      presetMachineId?: string;
    }
  | {
      mode: "edit";
      action: (prev: FormState, formData: FormData) => Promise<FormState>;
      /** เครื่องของ Alarm นี้ — แสดงอย่างเดียว เปลี่ยนไม่ได้ */
      machineLabel: string;
      nowLocal: string;
      defaults: { alarm_code: string; description: string; occurred_at: string };
      cancelHref: string;
    };

/**
 * ฟอร์ม Alarm — โหมด create (บันทึกใหม่) และ edit (แก้รายละเอียดระหว่างที่ยังไม่ปิด)
 * ถ้าบันทึกไม่ผ่าน ค่าที่กรอกไว้จะยังอยู่ (server ส่งกลับมาใน state.values)
 */
export function AlarmForm(props: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(props.action, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = (name: string) => errors[name]?.[0];
  const sent = (name: string) => (state && !state.ok ? state.values?.[name] : undefined);
  const initial = props.mode === "edit" ? props.defaults : undefined;
  const val = (name: "alarm_code" | "description" | "occurred_at") => sent(name) ?? initial?.[name];

  const machineValue = props.mode === "create" ? sent("machine_id") ?? props.presetMachineId ?? "" : "";

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state && !state.ok && <Notice tone="bad">{state.message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        {props.mode === "create" ? (
          <FieldShell id="machine_id" label="เครื่องจักร" required error={err("machine_id")}>
            {/* key: ให้ช่องเลือกคงค่าหลังบันทึกไม่ผ่าน (เหตุผลเดียวกับใน machine-form.tsx) */}
            <select key={`m-${machineValue}`} id="machine_id" name="machine_id" defaultValue={machineValue}
              aria-invalid={Boolean(err("machine_id"))} className={inputClass(Boolean(err("machine_id")), "font-mono")}>
              <option value="">— เลือกเครื่องจักร —</option>
              {props.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_id} · {m.machine_name}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : (
          <FieldShell id="machine_readonly" label="เครื่องจักร (เปลี่ยนไม่ได้)">
            <div id="machine_readonly" className="rounded-[3px] border border-line bg-panelhead px-3 py-2 font-mono text-sm">
              {props.machineLabel}
            </div>
          </FieldShell>
        )}

        <FieldShell id="occurred_at" label="วันเวลาที่เกิด (เวลาไทย)" required error={err("occurred_at")}>
          <input id="occurred_at" name="occurred_at" type="datetime-local"
            defaultValue={val("occurred_at") ?? props.nowLocal} max={props.nowLocal}
            aria-invalid={Boolean(err("occurred_at"))} className={inputClass(Boolean(err("occurred_at")), "font-mono")} />
        </FieldShell>

        <FieldShell id="alarm_code" label="รหัส Alarm" required error={err("alarm_code")}
          hint="รหัสจากเครื่องหรือคู่มือ เช่น E-042, ALM-103">
          <input id="alarm_code" name="alarm_code" defaultValue={val("alarm_code")} maxLength={30} autoComplete="off"
            aria-invalid={Boolean(err("alarm_code"))} className={inputClass(Boolean(err("alarm_code")), "font-mono uppercase")} />
        </FieldShell>

        <div className="sm:col-span-2">
          <FieldShell id="description" label="รายละเอียดอาการ" required error={err("description")}>
            <textarea id="description" name="description" rows={3} maxLength={500} defaultValue={val("description")}
              aria-invalid={Boolean(err("description"))} className={inputClass(Boolean(err("description")))} />
          </FieldShell>
        </div>
      </div>

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "กำลังบันทึก…" : props.mode === "create" ? "บันทึก Alarm" : "บันทึกการแก้ไข"}
        </button>
        <Link href={props.mode === "create" ? "/alarms" : props.cancelHref} className={buttonClass.secondary}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
