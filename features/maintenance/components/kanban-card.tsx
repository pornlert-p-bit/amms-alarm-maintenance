import Link from "next/link";

import { MntStatusBadge } from "@/components/station/mnt-status-badge";
import { formatDateTime } from "@/lib/format";

import type { Maintenance } from "../queries";
import { nextMntStatuses } from "../rules";
import { MaintenanceActions } from "./maintenance-actions";

/**
 * การ์ดใบงานหนึ่งใบบนบอร์ด Kanban
 * ปุ่มเลื่อนสถานะอยู่บนการ์ดเลย (ไม่ใช้ลากวาง เพราะใช้กับจอสัมผัส/คีย์บอร์ดได้ง่ายกว่า)
 * ยกเว้น "ปิดงาน" ต้องเข้าไปกรอกการแก้ไขในหน้ารายละเอียด
 */
export function KanbanCard({ m, techName, canAct }: { m: Maintenance; techName: string; canAct: boolean }) {
  const next = nextMntStatuses(m.status);
  return (
    <li className="rounded-[3px] border border-line-strong bg-white p-3 text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono font-semibold">
          {m.machine?.machine_id ?? "—"}
          {m.machine?.deleted_at && <span className="ml-1 font-sans text-xs font-normal text-muted">(ลบแล้ว)</span>}
        </span>
        <MntStatusBadge status={m.status} />
      </div>
      <p className="mb-2 line-clamp-2 text-ink" title={m.problem}>{m.problem}</p>
      <dl className="mb-2 space-y-0.5 text-xs text-ink-2">
        <div className="flex gap-1.5"><dt className="text-muted">ช่าง:</dt><dd>{techName}</dd></div>
        <div className="flex gap-1.5"><dt className="text-muted">เข้าซ่อม:</dt><dd className="font-mono">{formatDateTime(m.maintained_at)}</dd></div>
        {m.alarm && (
          <div className="flex gap-1.5"><dt className="text-muted">Alarm:</dt><dd className="font-mono">{m.alarm.alarm_code}</dd></div>
        )}
      </dl>
      <div className="flex flex-wrap items-start justify-between gap-2 border-t border-line pt-2">
        {canAct && next.length > 0 ? (
          <MaintenanceActions id={m.id} status={m.status} nextStatuses={next} compact />
        ) : (
          <span />
        )}
        <Link href={`/maintenance/${m.id}`} className="text-xs text-accent hover:underline">
          {canAct && next.includes("Done") ? "ปิดงาน / รายละเอียด ›" : "รายละเอียด ›"}
        </Link>
      </div>
    </li>
  );
}
