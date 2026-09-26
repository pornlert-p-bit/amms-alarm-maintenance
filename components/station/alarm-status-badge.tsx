import { ALARM_STATUS_LABEL } from "@/features/alarm/rules";
import type { AlarmStatus } from "@/features/alarm/schema";

/**
 * ป้ายสถานะ Alarm ตามหลัก ISA-101
 *   Open        → แดงทึบ (ยังไม่มีคนรับ — ต้องสนใจทันที)
 *   In Progress → ส้ม (มีคนกำลังแก้)
 *   Closed      → เทา (จบแล้ว ไม่ต้องดึงความสนใจ)
 */
const STYLE: Record<AlarmStatus, { code: string; cls: string }> = {
  Open: { code: "OPEN", cls: "border-bad bg-bad text-white" },
  "In Progress": { code: "IN PROGRESS", cls: "border-warn bg-warn-bg text-warn-ink" },
  Closed: { code: "CLOSED", cls: "border-line-strong bg-neutral text-neutral-ink" },
};

export function AlarmStatusBadge({ status }: { status: AlarmStatus }) {
  const s = STYLE[status];
  return (
    <span
      title={ALARM_STATUS_LABEL[status]}
      className={`inline-block whitespace-nowrap rounded-[3px] border px-2 py-0.5 text-center font-mono text-[11.5px] font-semibold ${s.cls}`}
    >
      {s.code}
      <span className="sr-only"> ({ALARM_STATUS_LABEL[status]})</span>
    </span>
  );
}
