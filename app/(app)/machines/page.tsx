import type { Metadata } from "next";
import Link from "next/link";

import { GroupBox } from "@/components/station/group-box";
import { MachineStatusBadge } from "@/components/station/machine-status-badge";
import { PageHeader } from "@/components/station/page-title";
import { buttonClass, inputClass, Notice, tableClass } from "@/components/station/ui";
import { DeleteMachineButton } from "@/features/machine/components/delete-machine-button";
import { getMachines, MACHINE_PAGE_SIZE } from "@/features/machine/queries";
import { MACHINE_STATUS_LABEL, parsePage, sanitizeSearch } from "@/features/machine/rules";
import { MACHINE_STATUSES, type MachineStatus } from "@/features/machine/schema";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "เครื่องจักร" };

type Props = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; saved?: string; deleted?: string }>;
};

export default async function MachinesPage({ searchParams }: Props) {
  const user = await requireUser(); // ทุก Role ดูได้ (REQ-MCH-06) — แก้ไขได้เฉพาะ Admin
  const sp = await searchParams;

  // ค่าจาก URL ไม่น่าเชื่อถือ — ทำความสะอาดทุกตัวก่อนใช้
  const search = sanitizeSearch(sp.q);
  const status = (MACHINE_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as MachineStatus)
    : null;
  const page = parsePage(sp.page);

  const { rows, total } = await getMachines({ search, status, page });
  const admin = isAdmin(user.role);
  const lastPage = Math.max(1, Math.ceil(total / MACHINE_PAGE_SIZE));
  const filtered = Boolean(search || status);

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/machines?${s}` : "/machines";
  };

  return (
    <>
      <PageHeader title="เครื่องจักร" sub="Machine Master">
        {admin && (
          <Link href="/machines/new" className={buttonClass.primary}>
            + เพิ่มเครื่องจักร
          </Link>
        )}
      </PageHeader>

      {/* แสดงผลการบันทึก/ลบ — ใช้ sanitizeSearch กันข้อความแปลก ๆ ที่ถูกใส่มาใน URL */}
      {sp.saved && <Notice tone="ok">บันทึกเครื่องจักร {sanitizeSearch(sp.saved)} แล้ว</Notice>}
      {sp.deleted && <Notice tone="ok">ลบเครื่องจักร {sanitizeSearch(sp.deleted)} ออกจากรายการแล้ว (ประวัติยังถูกเก็บไว้)</Notice>}

      <div className="space-y-6">
        {/* ฟอร์มค้นหาแบบ GET: ส่งค่าเป็น ?q=...&status=... ทำงานได้โดยไม่ต้องใช้ JavaScript */}
        <GroupBox title="ค้นหา">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="q" className="mb-1 block text-[13px] text-ink-2">
                รหัสหรือชื่อเครื่องจักร
              </label>
              <input id="q" name="q" defaultValue={search} placeholder="เช่น M-001 หรือ CNC" className={inputClass(false)} />
            </div>
            <div className="w-[200px]">
              <label htmlFor="status" className="mb-1 block text-[13px] text-ink-2">
                สถานะ
              </label>
              <select id="status" name="status" defaultValue={status ?? ""} className={inputClass(false)}>
                <option value="">ทุกสถานะ</option>
                {MACHINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s} — {MACHINE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonClass.secondary}>
              ค้นหา
            </button>
            {filtered && (
              <Link href="/machines" className="py-2 text-[13px] text-accent hover:underline">
                ล้างเงื่อนไข
              </Link>
            )}
          </form>
        </GroupBox>

        <GroupBox title="รายการเครื่องจักร" aside={`${total} เครื่อง`}>
          {rows.length === 0 ? (
            <div className="py-6 text-center text-muted">
              {filtered ? (
                "ไม่พบเครื่องจักรตามเงื่อนไขที่ค้นหา"
              ) : admin ? (
                <>
                  ยังไม่มีเครื่องจักรในระบบ —{" "}
                  <Link href="/machines/new" className="text-accent hover:underline">
                    เพิ่มเครื่องแรก
                  </Link>
                </>
              ) : (
                "ยังไม่มีเครื่องจักรในระบบ"
              )}
            </div>
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>รหัส</th>
                    <th className={tableClass.th}>ชื่อเครื่องจักร</th>
                    <th className={tableClass.th}>ประเภท</th>
                    <th className={tableClass.th}>ตำแหน่ง</th>
                    <th className={tableClass.th}>สถานะ</th>
                    <th className={tableClass.th}>แก้ไขล่าสุด</th>
                    {admin && <th className={`${tableClass.th} text-right`}>จัดการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="hover:bg-accent-soft/40">
                      <td className={`${tableClass.td} ${tableClass.mono} font-semibold`}>
                        <Link href={`/machines/${m.id}`} className="text-accent hover:underline" title="ดูประวัติเครื่อง">{m.machine_id}</Link>
                      </td>
                      <td className={tableClass.td}>{m.machine_name}</td>
                      <td className={tableClass.td}>{m.machine_type}</td>
                      <td className={tableClass.td}>{m.location}</td>
                      <td className={tableClass.td}>
                        <MachineStatusBadge status={m.status} />
                      </td>
                      <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap text-ink-2`}>
                        {formatDateTime(m.updated_at)}
                      </td>
                      {admin && (
                        <td className={`${tableClass.td} whitespace-nowrap text-right`}>
                          <div className="inline-flex items-start gap-1.5">
                            <Link href={`/machines/${m.id}/edit`} className={buttonClass.small}>
                              แก้ไข
                            </Link>
                            <DeleteMachineButton id={m.id} machineId={m.machine_id} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastPage > 1 && (
            <nav aria-label="เลขหน้า" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className={buttonClass.small}>
                  ‹ ก่อนหน้า
                </Link>
              )}
              <span className="font-mono text-ink-2">
                หน้า {page} / {lastPage}
              </span>
              {page < lastPage && (
                <Link href={pageHref(page + 1)} className={buttonClass.small}>
                  ถัดไป ›
                </Link>
              )}
            </nav>
          )}
        </GroupBox>
      </div>
    </>
  );
}
