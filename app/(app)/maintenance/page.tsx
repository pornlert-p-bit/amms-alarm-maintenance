import type { Metadata } from "next";
import Link from "next/link";

import { GroupBox } from "@/components/station/group-box";
import { PageHeader } from "@/components/station/page-title";
import { buttonClass, inputClass } from "@/components/station/ui";
import { getMachineOptions, isUuid } from "@/features/machine/queries";
import { KanbanCard } from "@/features/maintenance/components/kanban-card";
import { DONE_ON_BOARD, getMaintenanceBoard } from "@/features/maintenance/queries";
import { MNT_STATUS_LABEL } from "@/features/maintenance/rules";
import { MNT_STATUSES } from "@/features/maintenance/schema";
import { getStaffDirectory, staffNameOf } from "@/features/staff/queries";
import { requireUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { bangkokDayRange } from "@/lib/format";

export const metadata: Metadata = { title: "งานซ่อมบำรุง" };

type Props = {
  searchParams: Promise<{ machine?: string; tech?: string; from?: string; to?: string }>;
};

/** สีแถบหัวคอลัมน์ — ตรงกับป้ายสถานะ (ISA-101: มีสีเฉพาะคอลัมน์ที่ต้องตาม) */
const COLUMN_BAR: Record<(typeof MNT_STATUSES)[number], string> = {
  Open: "border-t-line-strong",
  "In Progress": "border-t-accent",
  "Waiting Part": "border-t-warn",
  Done: "border-t-line-strong",
};

export default async function MaintenancePage({ searchParams }: Props) {
  const user = await requireUser(); // ทุก Role ดูได้ (REQ-MNT-06) — เปิด/เปลี่ยนสถานะได้เฉพาะ staff
  const sp = await searchParams;

  // ทำความสะอาดค่าจาก URL ทุกตัว (REQ-SRC-03 + REQ-BON-08)
  const machineId = sp.machine && isUuid(sp.machine) ? sp.machine : null;
  const technicianId = sp.tech && isUuid(sp.tech) ? sp.tech : null;
  const fromDay = sp.from && bangkokDayRange(sp.from) ? sp.from : "";
  const toDay = sp.to && bangkokDayRange(sp.to) ? sp.to : "";

  const [board, machines, staffList] = await Promise.all([
    getMaintenanceBoard({
      machineId,
      technicianId,
      fromIso: fromDay ? bangkokDayRange(fromDay)!.start : null,
      toIso: toDay ? bangkokDayRange(toDay)!.end : null,
    }),
    getMachineOptions(),
    getStaffDirectory(),
  ]);

  const staff = isStaff(user.role);
  const technicians = staffList.filter((s) => s.role === "admin" || s.role === "technician");
  const filtered = Boolean(machineId || technicianId || fromDay || toDay);

  const columns = MNT_STATUSES.map((status) => ({
    status,
    items: status === "Done" ? board.done : board.active.filter((m) => m.status === status),
  }));

  return (
    <>
      <PageHeader title="งานซ่อมบำรุง" sub="Maintenance Record">
        {staff && (
          <Link href="/maintenance/new" className={buttonClass.primary}>
            + เปิดใบงานซ่อม
          </Link>
        )}
      </PageHeader>

      <div className="space-y-6">
        <GroupBox title="กรองรายการ">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label htmlFor="machine" className="mb-1 block text-[13px] text-ink-2">เครื่องจักร</label>
              <select id="machine" name="machine" defaultValue={machineId ?? ""} className={inputClass(false, "font-mono")}>
                <option value="">ทุกเครื่อง</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.machine_id} · {m.machine_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tech" className="mb-1 block text-[13px] text-ink-2">ช่างผู้รับผิดชอบ</label>
              <select id="tech" name="tech" defaultValue={technicianId ?? ""} className={inputClass(false)}>
                <option value="">ทุกคน</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="from" className="mb-1 block text-[13px] text-ink-2">เข้าซ่อมตั้งแต่</label>
              <input id="from" name="from" type="date" defaultValue={fromDay} className={inputClass(false, "font-mono")} />
            </div>
            <div>
              <label htmlFor="to" className="mb-1 block text-[13px] text-ink-2">ถึงวันที่</label>
              <input id="to" name="to" type="date" defaultValue={toDay} className={inputClass(false, "font-mono")} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={buttonClass.secondary}>กรอง</button>
              {filtered && <Link href="/maintenance" className="whitespace-nowrap text-[13px] text-accent hover:underline">ล้าง</Link>}
            </div>
          </form>
        </GroupBox>

        <GroupBox title="บอร์ดใบงาน" aside={`ค้าง ${board.active.length} · เสร็จ ${board.doneTotal}`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map(({ status, items }) => (
              <section key={status} aria-label={`${status} ${MNT_STATUS_LABEL[status]}`}
                className={`flex min-h-[160px] flex-col rounded-[3px] border border-line border-t-[3px] bg-ground ${COLUMN_BAR[status]}`}>
                <header className="flex items-baseline justify-between border-b border-line px-3 py-2">
                  <h3 className="text-[13px] font-semibold">
                    <span className="font-mono">{status.toUpperCase()}</span>
                    <span className="ml-1.5 font-normal text-ink-2">{MNT_STATUS_LABEL[status]}</span>
                  </h3>
                  <span className="font-mono text-xs text-muted">
                    {status === "Done" && board.doneTotal > items.length ? `${items.length}/${board.doneTotal}` : items.length}
                  </span>
                </header>
                {items.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted">ไม่มีใบงาน</p>
                ) : (
                  <ul className="space-y-2 p-2">
                    {items.map((m) => (
                      <KanbanCard key={m.id} m={m} techName={staffNameOf(staffList, m.technician_id)} canAct={staff} />
                    ))}
                  </ul>
                )}
                {status === "Done" && board.doneTotal > DONE_ON_BOARD && (
                  <p className="mt-auto border-t border-line px-3 py-2 text-xs text-muted">
                    แสดง {DONE_ON_BOARD} ใบงานล่าสุด — ใช้ตัวกรองวันที่เพื่อดูงานเก่า
                  </p>
                )}
              </section>
            ))}
          </div>
        </GroupBox>
      </div>
    </>
  );
}
