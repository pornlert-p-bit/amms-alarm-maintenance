import type { Metadata } from "next";
import Link from "next/link";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { buttonClass, inputClass, tableClass } from "@/components/station/ui";
import {
  actionLabel,
  AUDIT_ENTITIES,
  auditDiff,
  ENTITY_LABEL,
  formatAuditValue,
  isSensitiveAction,
  type AuditEntity,
} from "@/features/audit/format";
import { AUDIT_PAGE_SIZE, getAuditLogs, type AuditRow } from "@/features/audit/queries";
import { isUuid } from "@/features/machine/queries";
import { parsePage } from "@/features/machine/rules";
import { getStaffDirectory, staffNameOf } from "@/features/staff/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { bangkokDayRange, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit Log" };

type Props = {
  searchParams: Promise<{ entity?: string; actor?: string; from?: string; to?: string; page?: string }>;
};

/** ลิงก์ไปยังรายการที่ถูกแก้ (ถ้ายังเปิดดูได้) */
function entityHref(r: AuditRow): string | null {
  if (!r.entity_id || !r.entityLabel) return null; // หาไม่เจอ = ถูกลบไปแล้ว ไม่ต้องทำลิงก์ที่เปิดแล้วเจอ "ไม่พบ"
  if (r.entity_type === "alarm") return `/alarms/${r.entity_id}`;
  if (r.entity_type === "maintenance") return `/maintenance/${r.entity_id}`;
  if (r.entity_type === "machine") return `/machines/${r.entity_id}`; // หน้าประวัติเปิดได้แม้เครื่องถูกลบแล้ว
  return null;
}

/** หน้า Audit Log — Admin เท่านั้น (REQ-BON-05) อ่านอย่างเดียว ไม่มีปุ่มแก้/ลบ (append-only) */
export default async function AuditPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  const entity = (AUDIT_ENTITIES as readonly string[]).includes(sp.entity ?? "") ? (sp.entity as AuditEntity) : null;
  const actorId = sp.actor && isUuid(sp.actor) ? sp.actor : null;
  const fromDay = sp.from && bangkokDayRange(sp.from) ? sp.from : "";
  const toDay = sp.to && bangkokDayRange(sp.to) ? sp.to : "";
  const page = parsePage(sp.page);

  const [{ rows, total }, staff] = await Promise.all([
    getAuditLogs({
      entity,
      actorId,
      fromIso: fromDay ? bangkokDayRange(fromDay)!.start : null,
      toIso: toDay ? bangkokDayRange(toDay)!.end : null,
      page,
    }),
    getStaffDirectory(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const filtered = Boolean(entity || actorId || fromDay || toDay);
  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (entity) qs.set("entity", entity);
    if (actorId) qs.set("actor", actorId);
    if (fromDay) qs.set("from", fromDay);
    if (toDay) qs.set("to", toDay);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/audit?${s}` : "/audit";
  };

  return (
    <>
      <PageTitle title="Audit Log" sub="ประวัติการเปลี่ยนแปลงข้อมูล (อ่านอย่างเดียว)" />

      <div className="space-y-6">
        <GroupBox title="กรองรายการ">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label htmlFor="entity" className="mb-1 block text-[13px] text-ink-2">ประเภทข้อมูล</label>
              <select id="entity" name="entity" defaultValue={entity ?? ""} className={inputClass(false)}>
                <option value="">ทั้งหมด</option>
                {AUDIT_ENTITIES.map((e) => (
                  <option key={e} value={e}>{ENTITY_LABEL[e]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="actor" className="mb-1 block text-[13px] text-ink-2">ผู้ทำรายการ</label>
              <select id="actor" name="actor" defaultValue={actorId ?? ""} className={inputClass(false)}>
                <option value="">ทุกคน</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
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
              {filtered && <Link href="/audit" className="whitespace-nowrap text-[13px] text-accent hover:underline">ล้าง</Link>}
            </div>
          </form>
        </GroupBox>

        <GroupBox title="บันทึกการเปลี่ยนแปลง" aside={`${total} รายการ`}>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-muted">{filtered ? "ไม่พบรายการตามเงื่อนไขที่กรอง" : "ยังไม่มีบันทึก"}</p>
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>เวลา</th>
                    <th className={tableClass.th}>ผู้ทำรายการ</th>
                    <th className={tableClass.th}>การกระทำ</th>
                    <th className={tableClass.th}>รายการ</th>
                    <th className={tableClass.th}>สิ่งที่เปลี่ยน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const diff = auditDiff(r.before_data, r.after_data);
                    const href = entityHref(r);
                    const name =
                      r.entity_type === "profile" ? staffNameOf(staff, r.entity_id) : r.entityLabel ?? formatAuditValue(r.entity_id);
                    return (
                      <tr key={r.id} className="align-top hover:bg-accent-soft/20">
                        <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap align-top`}>{formatDateTime(r.created_at)}</td>
                        <td className={`${tableClass.td} whitespace-nowrap align-top`}>
                          {staffNameOf(staff, r.actor_id)}
                          {r.actor_role && <span className="ml-1.5 font-mono text-[11px] text-muted">{r.actor_role.toUpperCase()}</span>}
                        </td>
                        <td className={`${tableClass.td} whitespace-nowrap align-top`}>
                          <span className={isSensitiveAction(r.action) ? "font-semibold text-warn-ink" : ""}>{actionLabel(r.action)}</span>
                        </td>
                        <td className={`${tableClass.td} whitespace-nowrap align-top`}>
                          <span className="mr-1.5 text-xs text-muted">{ENTITY_LABEL[r.entity_type] ?? r.entity_type}</span>
                          {href ? (
                            <Link href={href} className="font-mono text-accent hover:underline">{name}</Link>
                          ) : (
                            <span className="font-mono">{name}</span>
                          )}
                        </td>
                        <td className={`${tableClass.td} align-top`}>
                          {diff.length === 0 ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <ul className="space-y-0.5 text-xs">
                              {diff.map((d) => (
                                <li key={d.key} className="break-words">
                                  <span className="font-mono text-ink-2">{d.key}</span>{" "}
                                  {d.from !== null && <><span className="text-muted line-through">{formatAuditValue(d.from)}</span>{" → "}</>}
                                  <span>{formatAuditValue(d.to)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
