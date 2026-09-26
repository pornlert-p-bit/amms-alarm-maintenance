"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { buttonClass, FieldShell, inputClass, Notice } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

type MachineOption = { id: string; machine_id: string; machine_name: string };
type AlarmOption = { id: string; alarm_code: string; machine_id: string; machine_code: string };
type TechOption = { id: string; full_name: string; role: string };

type Common = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  technicians: TechOption[];
  nowLocal: string;
};

type Props =
  | (Common & {
      mode: "create";
      machines: MachineOption[];
      alarms: AlarmOption[];
      preset?: { machine_id?: string; alarm_id?: string; technician_id?: string };
    })
  | (Common & {
      mode: "edit";
      /** เครื่องและ Alarm ของใบงานนี้ — แสดงอย่างเดียว เปลี่ยนไม่ได้ */
      originLabel: string;
      defaults: { technician_id: string; problem: string; maintained_at: string };
      cancelHref: string;
    });

/**
 * ฟอร์มเปิดใบงานซ่อม / แก้รายละเอียดใบงาน
 * โหมด create: เลือกเครื่องแล้วรายการ Alarm จะกรองเหลือเฉพาะของเครื่องนั้น (ฐานข้อมูลก็ตรวจซ้ำด้วย trigger)
 */
export function MaintenanceForm(props: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(props.action, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = (name: string) => errors[name]?.[0];
  const sent = (name: string) => (state && !state.ok ? state.values?.[name] : undefined);
  const initial = props.mode === "edit" ? props.defaults : undefined;
  const val = (name: "technician_id" | "problem" | "maintained_at") => sent(name) ?? initial?.[name];

  // เครื่องที่เลือกอยู่ — ใช้กรองรายการ Alarm (เฉพาะโหมด create)
  const presetMachine = props.mode === "create" ? sent("machine_id") ?? props.preset?.machine_id ?? "" : "";
  const [machineSel, setMachineSel] = useState(presetMachine);
  const alarmValue = props.mode === "create" ? sent("alarm_id") ?? props.preset?.alarm_id ?? "" : "";
  const techValue = val("technician_id") ?? (props.mode === "create" ? props.preset?.technician_id : undefined) ?? "";

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state && !state.ok && <Notice tone="bad">{state.message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        {props.mode === "create" ? (
          <>
            <FieldShell id="machine_id" label="เครื่องจักร" required error={err("machine_id")}>
              <select key={`m-${presetMachine}`} id="machine_id" name="machine_id" defaultValue={presetMachine}
                onChange={(e) => setMachineSel(e.target.value)}
                aria-invalid={Boolean(err("machine_id"))} className={inputClass(Boolean(err("machine_id")), "font-mono")}>
                <option value="">— เลือกเครื่องจักร —</option>
                {props.machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.machine_id} · {m.machine_name}</option>
                ))}
              </select>
            </FieldShell>

            <FieldShell id="alarm_id" label="ผูกกับ Alarm (ถ้ามี)" error={err("alarm_id")}
              hint="เว้นว่างได้ถ้าเป็นงานบำรุงรักษาตามแผน (PM)">
              <select key={`a-${alarmValue}-${machineSel}`} id="alarm_id" name="alarm_id"
                defaultValue={props.alarms.some((a) => a.id === alarmValue && a.machine_id === machineSel) ? alarmValue : ""}
                aria-invalid={Boolean(err("alarm_id"))} className={inputClass(Boolean(err("alarm_id")), "font-mono")}>
                <option value="">— ไม่ผูกกับ Alarm —</option>
                {props.alarms
                  .filter((a) => a.machine_id === machineSel)
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.machine_code} · {a.alarm_code}</option>
                  ))}
              </select>
            </FieldShell>
          </>
        ) : (
          <div className="sm:col-span-2">
            <FieldShell id="origin_readonly" label="เครื่องจักร / Alarm (เปลี่ยนไม่ได้)">
              <div id="origin_readonly" className="rounded-[3px] border border-line bg-panelhead px-3 py-2 font-mono text-sm">
                {props.originLabel}
              </div>
            </FieldShell>
          </div>
        )}

        <FieldShell id="technician_id" label="ช่างผู้รับผิดชอบ" required error={err("technician_id")}>
          <select key={`t-${techValue}`} id="technician_id" name="technician_id" defaultValue={techValue}
            aria-invalid={Boolean(err("technician_id"))} className={inputClass(Boolean(err("technician_id")))}>
            <option value="">— เลือกช่าง —</option>
            {props.technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}{t.role === "admin" ? " (ผู้ดูแลระบบ)" : ""}</option>
            ))}
          </select>
        </FieldShell>

        <FieldShell id="maintained_at" label="วันเวลาเข้าซ่อม (เวลาไทย)" required error={err("maintained_at")}
          hint="ระบุล่วงหน้าได้ถ้าเป็นงานที่วางแผนไว้">
          <input id="maintained_at" name="maintained_at" type="datetime-local"
            defaultValue={val("maintained_at") ?? props.nowLocal}
            aria-invalid={Boolean(err("maintained_at"))} className={inputClass(Boolean(err("maintained_at")), "font-mono")} />
        </FieldShell>

        <div className="sm:col-span-2">
          <FieldShell id="problem" label="ปัญหาที่พบ / งานที่ต้องทำ" required error={err("problem")}>
            <textarea id="problem" name="problem" rows={3} maxLength={500} defaultValue={val("problem")}
              aria-invalid={Boolean(err("problem"))} className={inputClass(Boolean(err("problem")))} />
          </FieldShell>
        </div>
      </div>

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "กำลังบันทึก…" : props.mode === "create" ? "เปิดใบงานซ่อม" : "บันทึกการแก้ไข"}
        </button>
        <Link href={props.mode === "create" ? "/maintenance" : props.cancelHref} className={buttonClass.secondary}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
