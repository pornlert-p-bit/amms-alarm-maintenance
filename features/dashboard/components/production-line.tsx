import Link from "next/link";

import type { MachineStatus } from "@/features/machine/schema";

import type { FloorMachine } from "../queries";

/**
 * ผังสายการผลิต (mimic diagram) แบบหน้าจอ SCADA — เครื่องในไลน์เดียวกันต่อกันด้วยลูกศรตามทิศทางงาน
 * ลำดับเครื่องในไลน์เรียงตามรหัสเครื่อง (v1 ยังไม่มีข้อมูลลำดับขั้นตอนจริง — ถ้าต้องการให้เพิ่มคอลัมน์ลำดับใน machines)
 * บนจอแคบ ไลน์ที่ยาวเกินจอเลื่อนซ้าย-ขวาได้ภายในกรอบ เหมือนการ pan ผังบนจอ HMI
 *
 * สีตาม ISA-101: RUN/STOP เป็นเทา (STOP ใช้เส้นประ = เครื่องไม่เดิน), MAINT ส้ม, ALARM แดง
 *
 * เครื่องที่มี Alarm ค้างแต่สถานะยังเป็น RUN/STOP (สถานะเครื่องเปลี่ยนด้วยมือใน v1 — ยังไม่มี PLC จริง)
 * จะได้ขอบแดงด้วย เพื่อให้คนเฝ้าจอเห็นทันทีว่าเครื่องไหนมีเรื่องค้าง แม้ป้ายสถานะยังไม่ถูกเปลี่ยน
 */
const BOX: Record<MachineStatus, string> = {
  Running: "border-line-strong bg-white",
  Stop: "border-dashed border-line-strong bg-panelhead",
  Maintenance: "border-warn bg-warn-bg/60",
  Alarm: "border-bad bg-bad-bg",
};

const TAG: Record<MachineStatus, { code: string; cls: string }> = {
  Running: { code: "RUN", cls: "text-neutral-ink" },
  Stop: { code: "STOP", cls: "text-muted" },
  Maintenance: { code: "MAINT", cls: "text-warn-ink" },
  Alarm: { code: "▲ ALARM", cls: "text-bad-ink" },
};

function Arrow() {
  return (
    <div aria-hidden="true" className="flex w-7 shrink-0 items-center">
      <div className="h-[2px] flex-1 bg-line-strong" />
      <div className="h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-line-strong" />
    </div>
  );
}

export function ProductionLine({ lines }: { lines: { location: string; machines: FloorMachine[] }[] }) {
  if (lines.length === 0) {
    return <p className="py-6 text-center text-muted">ยังไม่มีเครื่องจักรในระบบ</p>;
  }
  return (
    <div className="space-y-3">
      {lines.map(({ location, machines }) => (
        <section key={location} aria-label={`ไลน์ ${location}`} className="flex items-stretch overflow-hidden rounded-[3px] border border-line">
          {/* ป้ายชื่อไลน์แนวตั้งด้านซ้าย */}
          <div className="flex w-[74px] shrink-0 flex-col justify-center border-r border-line bg-top px-2 text-center">
            <span className="font-mono text-[12px] font-bold uppercase leading-tight text-white">{location}</span>
            <span className="mt-0.5 text-[10.5px] text-top-ink">{machines.length} เครื่อง</span>
          </div>

          <ol className="relative flex flex-1 items-center overflow-x-auto bg-ground px-3 py-3">
            {machines.map((m, i) => (
              <li key={m.id} className="flex shrink-0 items-center">
                {i > 0 && <Arrow />}
                <Link
                  href={`/machines/${m.id}`}
                  title={`${m.machine_id} · ${m.machine_name} — ดูประวัติเครื่อง`}
                  className={`block w-[150px] rounded-[3px] border-2 px-2.5 py-1.5 transition-colors hover:border-accent ${m.openAlarms > 0 && m.status !== "Alarm" ? "border-bad bg-white" : BOX[m.status]}`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono text-[13px] font-bold">{m.machine_id}</span>
                    <span className={`font-mono text-[10.5px] font-bold ${TAG[m.status].cls}`}>{TAG[m.status].code}</span>
                  </div>
                  <div className="truncate text-[11.5px] text-ink-2">{m.machine_name}</div>
                  <div className="mt-0.5 flex min-h-[15px] gap-2 font-mono text-[10.5px]">
                    {m.openAlarms > 0 && <span className="font-semibold text-bad-ink">ALM {m.openAlarms}</span>}
                    {m.activeJobs > 0 && <span className="text-warn-ink">WO {m.activeJobs}</span>}
                  </div>
                  <span className="sr-only">
                    สถานะ {TAG[m.status].code}
                    {m.openAlarms > 0 ? ` Alarm ค้าง ${m.openAlarms}` : ""}
                    {m.activeJobs > 0 ? ` ใบงานซ่อม ${m.activeJobs}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
