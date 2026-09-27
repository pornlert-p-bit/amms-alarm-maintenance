"use client";

import { useActionState } from "react";

import { MachineStatusBadge } from "@/components/station/machine-status-badge";
import { buttonClass, inputClass } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";

import { simulateFault, simulateStatus } from "../actions";
import type { FaultPreset, SimStatus } from "../faults";
import type { SimMachine } from "../queries";

const STATUS_BUTTONS: { to: SimStatus; label: string }[] = [
  { to: "Running", label: "RUN" },
  { to: "Stop", label: "STOP" },
  { to: "Maintenance", label: "MAINT" },
];

function Result({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-ok" : "text-bad-ink"}`}>
      {state.ok ? `✓ ${state.message ?? "ส่งแล้ว"}` : state.message}
    </p>
  );
}

/**
 * แผงควบคุมจำลองของเครื่องหนึ่งเครื่อง (แบบ faceplate บนจอ HMI)
 * - ปุ่มสถานะ: ส่งสัญญาณ RUN / STOP / MAINT (ปุ่มของสถานะปัจจุบันกดไม่ได้)
 * - จำลอง Fault: เลือกจากรายการตามประเภทเครื่อง → เครื่องเป็น ALARM และเกิด Alarm Record ใหม่
 */
export function SimPanel({ machine, faults }: { machine: SimMachine; faults: FaultPreset[] }) {
  const [statusState, statusAction, statusPending] = useActionState<FormState, FormData>(
    simulateStatus.bind(null, machine.id),
    null,
  );
  const [faultState, faultAction, faultPending] = useActionState<FormState, FormData>(
    simulateFault.bind(null, machine.id),
    null,
  );
  const busy = statusPending || faultPending;

  return (
    <li className={`flex flex-col gap-3 rounded-[3px] border-2 bg-white p-3 ${machine.status === "Alarm" ? "border-bad" : "border-line-strong"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[14px] font-bold">{machine.machine_id}</p>
          <p className="truncate text-xs text-ink-2">{machine.machine_name} · {machine.location}</p>
        </div>
        <MachineStatusBadge status={machine.status} />
      </div>

      <div>
        <p className="mb-1 text-[11.5px] text-muted">สัญญาณสถานะ</p>
        <div className="flex gap-1.5">
          {STATUS_BUTTONS.map((b) => (
            <form key={b.to} action={statusAction} className="flex-1">
              <input type="hidden" name="to" value={b.to} />
              <button type="submit" disabled={busy || machine.status === b.to}
                className={`${buttonClass.small} w-full justify-center font-mono disabled:cursor-not-allowed disabled:opacity-40`}>
                {b.label}
              </button>
            </form>
          ))}
        </div>
        <Result state={statusState} />
      </div>

      <form action={faultAction} className="border-t border-line pt-2.5">
        <label htmlFor={`fault-${machine.id}`} className="mb-1 block text-[11.5px] text-muted">จำลอง Fault</label>
        <div className="flex gap-1.5">
          <select id={`fault-${machine.id}`} name="fault" defaultValue="0" disabled={busy}
            className={inputClass(false, "min-w-0 flex-1 py-1 font-mono text-xs")}>
            {faults.map((f, i) => (
              <option key={f.code} value={i}>{f.code} · {f.description.split(" — ")[0]}</option>
            ))}
          </select>
          <button type="submit" disabled={busy} className={`${buttonClass.danger} px-2.5 py-1 text-xs`}>
            {faultPending ? "…" : "▲ Fault"}
          </button>
        </div>
        <Result state={faultState} />
      </form>
    </li>
  );
}
