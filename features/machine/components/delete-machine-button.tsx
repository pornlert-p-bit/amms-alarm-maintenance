"use client";

import { useActionState } from "react";

import { buttonClass } from "@/components/station/ui";

import { softDeleteMachine } from "../actions";

/**
 * ปุ่มลบเครื่องจักร (Soft Delete) — ถามยืนยันก่อน และแสดงเหตุผลถ้าลบไม่ได้ (เช่น ยังมี Alarm ค้าง)
 */
export function DeleteMachineButton({ id, machineId }: { id: string; machineId: string }) {
  const [state, formAction, pending] = useActionState(softDeleteMachine.bind(null, id), null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `ลบเครื่องจักร ${machineId} ออกจากรายการ?\n\nประวัติ Alarm และงานซ่อมของเครื่องนี้จะยังถูกเก็บไว้ (Soft Delete)`,
        );
        if (!ok) e.preventDefault();
      }}
      className="inline"
    >
      <button type="submit" disabled={pending} className={`${buttonClass.small} hover:border-bad hover:text-bad-ink`}>
        {pending ? "กำลังลบ…" : "ลบ"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="mt-1 max-w-[260px] whitespace-normal text-xs text-bad-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
