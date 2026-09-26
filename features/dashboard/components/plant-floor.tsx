import Link from "next/link";

import { MachineStatusBadge } from "@/components/station/machine-status-badge";
import type { MachineStatus } from "@/features/machine/schema";

import type { FloorMachine } from "../queries";

/**
 * ผังเครื่องจักรแยกตามไลน์ผลิต (location) — แบบหน้าจอ HMI ของห้องควบคุม
 * แถบซ้ายของแต่ละเครื่องมีสีเฉพาะเครื่องที่ผิดปกติ (ALARM แดง / MAINT ส้ม)
 * คลิกเครื่อง → หน้าประวัติของเครื่องนั้น (Machine History)
 */
const EDGE: Record<MachineStatus, string> = {
  Running: "border-l-line-strong bg-white",
  Stop: "border-l-line-strong bg-panelhead",
  Maintenance: "border-l-warn bg-white",
  Alarm: "border-l-bad bg-bad-bg/50",
};

export function PlantFloor({ lines }: { lines: { location: string; machines: FloorMachine[] }[] }) {
  if (lines.length === 0) {
    return <p className="py-6 text-center text-muted">ยังไม่มีเครื่องจักรในระบบ</p>;
  }
  return (
    <div className="space-y-4">
      {lines.map(({ location, machines }) => (
        <section key={location} aria-label={`ไลน์ ${location}`}>
          <h3 className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
            <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-accent" />
            {location}
            <span className="font-mono font-normal text-muted">· {machines.length} เครื่อง</span>
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {machines.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/machines/${m.id}`}
                  title={`${m.machine_id} · ${m.machine_name} — ดูประวัติเครื่อง`}
                  className={`block rounded-[3px] border border-l-[4px] border-line-strong px-2.5 py-2 transition-colors hover:border-accent ${EDGE[m.status]}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[13px] font-semibold">{m.machine_id}</span>
                    <MachineStatusBadge status={m.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-ink-2">{m.machine_name}</div>
                  <div className="mt-1 flex min-h-[16px] gap-2 text-[11px]">
                    {m.openAlarms > 0 && <span className="font-semibold text-bad-ink">Alarm ค้าง {m.openAlarms}</span>}
                    {m.activeJobs > 0 && <span className="text-warn-ink">ใบงาน {m.activeJobs}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
