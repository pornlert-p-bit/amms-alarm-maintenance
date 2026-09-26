import type { Metadata } from "next";
import Link from "next/link";

import { AlarmStatusBadge } from "@/components/station/alarm-status-badge";
import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { buttonClass, inputClass, tableClass } from "@/components/station/ui";
import { ALARM_PAGE_SIZE, getAlarms } from "@/features/alarm/queries";
import { ALARM_STATUS_LABEL } from "@/features/alarm/rules";
import { ALARM_STATUSES, type AlarmStatus } from "@/features/alarm/schema";
import { getMachineOptions, isUuid } from "@/features/machine/queries";
import { parsePage, sanitizeSearch } from "@/features/machine/rules";
import { requireUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { bangkokDayRange, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Alarm" };

type Props = {
  searchParams: Promise<{ machine?: string; status?: string; code?: string; from?: string; to?: string; page?: string }>;
};

export default async function AlarmsPage({ searchParams }: Props) {
  const user = await requireUser(); // ทุก Role ดูได้ (REQ-ALM-06) — บันทึก/เปลี่ยนสถานะได้เฉพาะ staff
  const sp = await searchParams;

  // ทำความสะอาดค่าจาก URL ทุกตัว (REQ-SRC-02 + REQ-BON-08 ช่วงวันที่)
  const machineId = sp.machine && isUuid(sp.machine) ? sp.machine : null;
  const status = (ALARM_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as AlarmStatus) : null;
  const code = sanitizeSearch(sp.code).toUpperCase();
  const fromDay = sp.from && bangkokDayRange(sp.from) ? sp.from : "";
  const toDay = sp.to && bangkokDayRange(sp.to) ? sp.to : "";
  const page = parsePage(sp.page);

  const [{ rows, total }, machines] = await Promise.all([
    getAlarms({
      machineId,
      status,
      code,
      fromIso: fromDay ? bangkokDayRange(fromDay)!.start : null,
      toIso: toDay ? bangkokDayRange(toDay)!.end : null, // ถึงสิ้นวันที่เลือก
      page,
    }),
    getMachineOptions(),
  ]);

  const staff = isStaff(user.role);
  const lastPage = Math.max(1, Math.ceil(total / ALARM_PAGE_SIZE));
  const filtered = Boolean(machineId || status || code || fromDay || toDay);

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (machineId) qs.set("machine", machineId);
    if (status) qs.set("status", status);
    if (code) qs.set("code", code);
    if (fromDay) qs.set("from", fromDay);
    if (toDay) qs.set("to", toDay);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/alarms?${s}` : "/alarms";
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Alarm" sub="Alarm Record" />
        {staff && (
          <Link href="/alarms/new" className={buttonClass.primary}>
            + บันทึก Alarm
          </Link>
        )}
      </div>

      <div className="space-y-6">
        <GroupBox title="กรองรายการ">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
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
              <label htmlFor="status" className="mb-1 block text-[13px] text-ink-2">สถานะ</label>
              <select id="status" name="status" defaultValue={status ?? ""} className={inputClass(false)}>
                <option value="">ทุกสถานะ</option>
                {ALARM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s} — {ALARM_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="code" className="mb-1 block text-[13px] text-ink-2">รหัส Alarm</label>
              <input id="code" name="code" defaultValue={code} placeholder="เช่น E-042" className={inputClass(false, "font-mono uppercase")} />
            </div>
            <div>
              <label htmlFor="from" className="mb-1 block text-[13px] text-ink-2">ตั้งแต่วันที่</label>
              <input id="from" name="from" type="date" defaultValue={fromDay} className={inputClass(false, "font-mono")} />
            </div>
            <div>
              <label htmlFor="to" className="mb-1 block text-[13px] text-ink-2">ถึงวันที่</label>
              <input id="to" name="to" type="date" defaultValue={toDay} className={inputClass(false, "font-mono")} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={buttonClass.secondary}>กรอง</button>
              {filtered && <Link href="/alarms" className="whitespace-nowrap text-[13px] text-accent hover:underline">ล้าง</Link>}
            </div>
          </form>
        </GroupBox>

        <GroupBox title="รายการ Alarm" aside={`${total} รายการ`}>
          {rows.length === 0 ? (
            <div className="py-6 text-center text-muted">
              {filtered ? "ไม่พบ Alarm ตามเงื่อนไขที่กรอง" : "ยังไม่มี Alarm ในระบบ"}
            </div>
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>เวลาเกิด</th>
                    <th className={tableClass.th}>เครื่องจักร</th>
                    <th className={tableClass.th}>รหัส</th>
                    <th className={tableClass.th}>รายละเอียด</th>
                    <th className={tableClass.th}>สถานะ</th>
                    <th className={`${tableClass.th} text-right`}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className={a.status === "Open" ? "bg-bad-bg/40" : "hover:bg-accent-soft/40"}>
                      <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap`}>{formatDateTime(a.occurred_at)}</td>
                      <td className={`${tableClass.td} whitespace-nowrap`}>
                        <span className={`${tableClass.mono} font-semibold`}>{a.machine?.machine_id ?? "—"}</span>
                        {a.machine?.deleted_at && <span className="ml-1 text-xs text-muted">(ลบแล้ว)</span>}
                      </td>
                      <td className={`${tableClass.td} ${tableClass.mono} font-semibold`}>{a.alarm_code}</td>
                      <td className={`${tableClass.td} max-w-[360px] truncate`} title={a.description}>{a.description}</td>
                      <td className={tableClass.td}><AlarmStatusBadge status={a.status} /></td>
                      <td className={`${tableClass.td} text-right`}>
                        <Link href={`/alarms/${a.id}`} className={buttonClass.small}>
                          {staff && a.status !== "Closed" ? "จัดการ" : "ดู"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastPage > 1 && (
            <nav aria-label="เลขหน้า" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
              {page > 1 && <Link href={pageHref(page - 1)} className={buttonClass.small}>‹ ก่อนหน้า</Link>}
              <span className="font-mono text-ink-2">หน้า {page} / {lastPage}</span>
              {page < lastPage && <Link href={pageHref(page + 1)} className={buttonClass.small}>ถัดไป ›</Link>}
            </nav>
          )}
        </GroupBox>
      </div>
    </>
  );
}
