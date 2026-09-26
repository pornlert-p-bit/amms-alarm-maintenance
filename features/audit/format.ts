/**
 * ตัวช่วยแสดง Audit Log — ฟังก์ชันบริสุทธิ์ เขียน unit test ได้
 * ชื่อ action ต้องตรงกับที่ Server Action แต่ละ module ส่งให้ writeAudit()
 */

export const AUDIT_ENTITIES = ["machine", "alarm", "maintenance", "profile"] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export const ENTITY_LABEL: Record<AuditEntity, string> = {
  machine: "เครื่องจักร",
  alarm: "Alarm",
  maintenance: "งานซ่อม",
  profile: "ผู้ใช้",
};

const ACTION_LABEL: Record<string, string> = {
  "machine.create": "เพิ่มเครื่องจักร",
  "machine.update": "แก้ไขเครื่องจักร",
  "machine.soft_delete": "ลบเครื่องจักร",
  "alarm.create": "บันทึก Alarm",
  "alarm.start": "รับงาน Alarm",
  "alarm.close": "ปิด Alarm",
  "alarm.update": "แก้ไข Alarm",
  "maintenance.create": "เปิดใบงานซ่อม",
  "maintenance.start": "เริ่มซ่อม",
  "maintenance.wait_part": "รออะไหล่",
  "maintenance.complete": "ปิดงานซ่อม",
  "maintenance.update": "แก้ไขใบงาน",
  "user.role_change": "เปลี่ยน Role",
};

/** ชื่อการกระทำภาษาไทย — ถ้าไม่รู้จัก (เช่น action ใหม่ที่ยังไม่ได้เพิ่ม) แสดงรหัสเดิม */
export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** การกระทำที่ "ทำลาย/ลดสิทธิ์" — ใช้สีเน้นในตาราง */
export function isSensitiveAction(action: string): boolean {
  return action === "machine.soft_delete" || action === "user.role_change";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LEN = 60;

/** แปลงค่าหนึ่งค่าเป็นข้อความสั้น: uuid ย่อเหลือ 8 ตัว, ข้อความยาวตัดท้าย, null = "—" */
export function formatAuditValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") {
    if (UUID_RE.test(v)) return `${v.slice(0, 8)}…`;
    return v.length > MAX_LEN ? `${v.slice(0, MAX_LEN)}…` : v;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const json = JSON.stringify(v);
  return json.length > MAX_LEN ? `${json.slice(0, MAX_LEN)}…` : json;
}

type Json = Record<string, unknown> | null | undefined;

/**
 * รายการช่องที่เปลี่ยน (ก่อน → หลัง) เรียงตามชื่อช่อง
 * - มีแต่ after (เช่น create) → แสดงทุกช่องของ after โดย from = null
 * - ค่าเท่ากัน → ไม่แสดง
 */
export function auditDiff(before: Json, after: Json): { key: string; from: unknown; to: unknown }[] {
  const b = before ?? {};
  const a = after ?? {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  return keys
    .filter((k) => JSON.stringify(b[k] ?? null) !== JSON.stringify(a[k] ?? null))
    .map((k) => ({ key: k, from: b[k] ?? null, to: a[k] ?? null }));
}
