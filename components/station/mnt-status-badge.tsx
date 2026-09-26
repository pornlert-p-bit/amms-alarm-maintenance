import { MNT_STATUS_LABEL } from "@/features/maintenance/rules";
import type { MntStatus } from "@/features/maintenance/schema";

/**
 * ป้ายสถานะงานซ่อม (ตามหลัก ISA-101 — สีเฉพาะสิ่งที่ต้องสนใจ)
 *   Open         → ขาว (รอเริ่ม ยังไม่ผิดปกติ)
 *   In Progress  → ฟ้าอ่อน (มีคนกำลังทำ)
 *   Waiting Part → ส้ม (งานติด ต้องตามอะไหล่)
 *   Done         → เทา (จบแล้ว)
 */
const STYLE: Record<MntStatus, { code: string; cls: string }> = {
  Open: { code: "OPEN", cls: "border-line-strong bg-white text-neutral-ink" },
  "In Progress": { code: "IN PROGRESS", cls: "border-accent bg-accent-soft text-accent" },
  "Waiting Part": { code: "WAITING PART", cls: "border-warn bg-warn-bg text-warn-ink" },
  Done: { code: "DONE", cls: "border-line-strong bg-neutral text-neutral-ink" },
};

export function MntStatusBadge({ status }: { status: MntStatus }) {
  const s = STYLE[status];
  return (
    <span
      title={MNT_STATUS_LABEL[status]}
      className={`inline-block whitespace-nowrap rounded-[3px] border px-2 py-0.5 font-mono text-[11.5px] font-semibold ${s.cls}`}
    >
      {s.code}
      <span className="sr-only"> ({MNT_STATUS_LABEL[status]})</span>
    </span>
  );
}
