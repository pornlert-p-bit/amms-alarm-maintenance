"use client";

import { useActionState } from "react";

import { buttonClass, FieldShell, inputClass, Notice } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

import { changeAlarmStatus } from "../actions";
import type { AlarmStatus } from "../schema";

/**
 * ปุ่มจัดการ Alarm: "รับงาน" (Open → In Progress) และฟอร์ม "ปิด Alarm" (ต้องมีสาเหตุ)
 * แสดงเฉพาะปุ่มที่กฎอนุญาต (nextStatuses มาจาก server) — แต่ server ก็ตรวจกฎซ้ำอีกครั้งเสมอ
 */
export function AlarmActions({ alarmId, nextStatuses }: { alarmId: string; nextStatuses: AlarmStatus[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changeAlarmStatus.bind(null, alarmId),
    null,
  );
  const causeError = state && !state.ok ? state.fieldErrors?.cause?.[0] : undefined;
  const causeValue = state && !state.ok ? state.values?.cause : undefined;

  return (
    <div className="space-y-4">
      {state && !state.ok && !causeError && <Notice tone="bad">{state.message}</Notice>}

      {nextStatuses.includes("In Progress") && (
        <form action={formAction}>
          <input type="hidden" name="to" value="In Progress" />
          <button type="submit" disabled={pending} className={buttonClass.secondary}>
            {pending ? "กำลังบันทึก…" : "รับงาน (เปลี่ยนเป็น In Progress)"}
          </button>
        </form>
      )}

      {nextStatuses.includes("Closed") && (
        <form action={formAction} noValidate className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="to" value="Closed" />
          <FieldShell id="cause" label="สาเหตุ / สิ่งที่แก้ไข" required error={causeError}
            hint="ต้องระบุก่อนปิด Alarm — ระบบจะบันทึกผู้ปิดและเวลาปิดให้อัตโนมัติ">
            <textarea id="cause" name="cause" rows={3} maxLength={500} defaultValue={causeValue}
              aria-invalid={Boolean(causeError)} className={inputClass(Boolean(causeError))} />
          </FieldShell>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "กำลังบันทึก…" : "ปิด Alarm"}
          </button>
        </form>
      )}
    </div>
  );
}
