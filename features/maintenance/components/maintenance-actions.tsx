"use client";

import { useActionState } from "react";

import { buttonClass, FieldShell, inputClass, Notice } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

import { changeMaintenanceStatus } from "../actions";
import { transitionLabel } from "../rules";
import type { MntStatus } from "../schema";

/**
 * ปุ่มเปลี่ยนสถานะใบงาน — ใช้ทั้งบนการ์ดในบอร์ด (compact) และในหน้ารายละเอียด
 * ปุ่ม "ปิดงาน" ต้องมีช่องบันทึกการแก้ไข จึงแสดงเฉพาะในหน้ารายละเอียด
 */
export function MaintenanceActions({
  id,
  status,
  nextStatuses,
  compact = false,
}: {
  id: string;
  status: MntStatus;
  nextStatuses: MntStatus[];
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeMaintenanceStatus.bind(null, id), null);
  const actionError = state && !state.ok ? state.fieldErrors?.action_taken?.[0] : undefined;
  const actionValue = state && !state.ok ? state.values?.action_taken : undefined;

  const quick = nextStatuses.filter((s) => s !== "Done");
  const canFinish = nextStatuses.includes("Done");

  return (
    <div className={compact ? "space-y-1.5" : "space-y-4"}>
      {state && !state.ok && !actionError && (
        compact ? <p role="alert" className="text-xs text-bad-ink">{state.message}</p> : <Notice tone="bad">{state.message}</Notice>
      )}

      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((to) => (
            <form key={to} action={formAction}>
              <input type="hidden" name="to" value={to} />
              {compact && <input type="hidden" name="back" value="board" />}
              <button type="submit" disabled={pending} className={compact ? buttonClass.small : buttonClass.secondary}>
                {transitionLabel(status, to)}
              </button>
            </form>
          ))}
        </div>
      )}

      {canFinish && !compact && (
        <form action={formAction} noValidate className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="to" value="Done" />
          <FieldShell id="action_taken" label="การแก้ไขที่ทำ" required error={actionError}
            hint="ต้องบันทึกก่อนปิดงาน — ใช้เป็นประวัติการซ่อมของเครื่อง">
            <textarea id="action_taken" name="action_taken" rows={3} maxLength={1000} defaultValue={actionValue}
              aria-invalid={Boolean(actionError)} className={inputClass(Boolean(actionError))} />
          </FieldShell>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "กำลังบันทึก…" : "ปิดงาน (Done)"}
          </button>
        </form>
      )}
    </div>
  );
}
