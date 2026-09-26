import "server-only";

import { isUuid } from "@/features/machine/queries";
import type { Role } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuditEntity } from "./format";

/** การอ่าน Audit Log — RLS audit_admin_select ให้ admin อ่านได้คนเดียว (หน้าเรียกหลัง requireAdmin) */

export const AUDIT_PAGE_SIZE = 25;

export type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_role: Role | null;
  action: string;
  entity_type: AuditEntity;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  /** ชื่อที่อ่านง่ายของรายการที่ถูกแก้ เช่น "M-003" หรือ "M-001 · E-101" (null = หาไม่เจอ/ถูกลบ) */
  entityLabel: string | null;
};

type Filter = {
  entity: AuditEntity | null;
  actorId: string | null;
  fromIso: string | null;
  toIso: string | null;
  page: number;
};

export async function getAuditLogs(f: Filter): Promise<{ rows: AuditRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("audit_logs")
    .select("id, created_at, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((f.page - 1) * AUDIT_PAGE_SIZE, f.page * AUDIT_PAGE_SIZE - 1);
  if (f.entity) q = q.eq("entity_type", f.entity);
  if (f.actorId && isUuid(f.actorId)) q = q.eq("actor_id", f.actorId);
  if (f.fromIso) q = q.gte("created_at", f.fromIso);
  if (f.toIso) q = q.lt("created_at", f.toIso);

  const { data, error, count } = await q;
  if (error) {
    console.error(`getAuditLogs failed: code=${error.code ?? "unknown"}`);
    throw new Error("โหลด Audit Log ไม่สำเร็จ");
  }
  const rows = (data ?? []) as Omit<AuditRow, "entityLabel">[];

  // หาชื่อของรายการที่ถูกแก้ — ยิงครั้งละประเภท (สูงสุด 3 ครั้ง ไม่ว่าจะมีกี่แถว)
  const idsOf = (t: AuditEntity) => [...new Set(rows.filter((r) => r.entity_type === t && r.entity_id).map((r) => r.entity_id!))];
  const [machines, alarms, jobs] = await Promise.all([
    lookup(supabase, "machines", "id, machine_id", idsOf("machine")),
    lookup(supabase, "alarms", "id, alarm_code, machine:machines(machine_id)", idsOf("alarm")),
    lookup(supabase, "maintenance_records", "id, machine:machines(machine_id)", idsOf("maintenance")),
  ]);

  const label = new Map<string, string>();
  for (const m of machines) label.set(m.id as string, m.machine_id as string);
  for (const a of alarms) label.set(a.id as string, `${(a.machine as { machine_id: string } | null)?.machine_id ?? "—"} · ${a.alarm_code}`);
  for (const j of jobs) label.set(j.id as string, `ใบงาน ${(j.machine as { machine_id: string } | null)?.machine_id ?? "—"}`);

  return {
    rows: rows.map((r) => ({ ...r, entityLabel: r.entity_id ? label.get(r.entity_id) ?? null : null })),
    total: count ?? 0,
  };
}

async function lookup(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  columns: string,
  ids: string[],
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from(table).select(columns).in("id", ids);
  if (error) {
    // หาชื่อไม่ได้ไม่ใช่เรื่องร้ายแรง — ตารางยังแสดงได้ แค่คอลัมน์ "รายการ" เป็นรหัสย่อ
    console.warn(`audit lookup ${table} failed: code=${error.code ?? "unknown"}`);
    return [];
  }
  return (data ?? []) as unknown as Record<string, unknown>[];
}
