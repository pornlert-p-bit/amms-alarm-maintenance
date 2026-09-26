import { MACHINE_STATUS_LABEL } from "@/features/machine/rules";
import type { MachineStatus } from "@/features/machine/schema";

/**
 * ป้ายสถานะเครื่องจักรตามหลัก ISA-101: สถานะปกติเป็นสีเทา สีใช้เฉพาะเมื่อผิดปกติ
 *   Running / Stop  → เทา (ปกติ ไม่ต้องดึงความสนใจ)
 *   Maintenance     → ส้ม (กำลังซ่อม)
 *   Alarm           → แดงทึบ (ต้องสนใจทันที)
 */
const STYLE: Record<MachineStatus, { code: string; cls: string }> = {
  Running: { code: "RUN", cls: "border-line-strong bg-white text-neutral-ink" },
  Stop: { code: "STOP", cls: "border-line-strong bg-neutral text-neutral-ink" },
  Maintenance: { code: "MAINT", cls: "border-warn bg-warn-bg text-warn-ink" },
  Alarm: { code: "ALARM", cls: "border-bad bg-bad text-white" },
};

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  const s = STYLE[status];
  return (
    <span
      title={MACHINE_STATUS_LABEL[status]}
      className={`inline-block min-w-[58px] rounded-[3px] border px-2 py-0.5 text-center font-mono text-[11.5px] font-semibold ${s.cls}`}
    >
      {s.code}
      <span className="sr-only"> ({MACHINE_STATUS_LABEL[status]})</span>
    </span>
  );
}
