import type { MachineStatus } from "./schema";

/**
 * กฎธุรกิจของเครื่องจักร — ฟังก์ชันบริสุทธิ์ ไม่แตะฐานข้อมูล จึงเขียน unit test ได้
 */

export const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  Running: "ทำงาน",
  Stop: "หยุด",
  Alarm: "เกิด Alarm",
  Maintenance: "ซ่อมบำรุง",
};

/**
 * BR-05: ห้ามลบเครื่องที่ยังมี Alarm ค้าง (ยังไม่ปิด)
 * เพราะ Alarm ที่ค้างอยู่ต้องมีเครื่องให้ช่างเห็นและปิดงานได้
 */
export function canDeleteMachine(input: { openAlarms: number }):
  | { ok: true }
  | { ok: false; reason: string } {
  if (input.openAlarms > 0) {
    return {
      ok: false,
      reason: `ลบไม่ได้ เพราะเครื่องนี้ยังมี Alarm ที่ยังไม่ปิด ${input.openAlarms} รายการ — ปิด Alarm ให้หมดก่อน`,
    };
  }
  return { ok: true };
}

/**
 * ทำความสะอาดคำค้นก่อนส่งให้ Supabase
 *
 * ทำไมต้องทำ: การค้นหลายคอลัมน์ใช้ตัวกรองแบบ "or(...)" ของ Supabase ซึ่งรับเป็นข้อความ
 * ถ้าผู้ใช้พิมพ์เครื่องหมายอย่าง , ( ) " เข้ามา จะทำให้ตัวกรองผิดรูปหรือถูกแทรกเงื่อนไขอื่นได้ (filter injection)
 * จึงเก็บไว้เฉพาะตัวอักษรไทย/อังกฤษ ตัวเลข ช่องว่าง ขีด จุด — และตัด % _ ที่เป็นอักขระพิเศษของการค้นแบบ LIKE
 */
export function sanitizeSearch(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[^0-9A-Za-z฀-๿ .-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

/** แปลงเลขหน้าจาก URL ให้ปลอดภัย — ค่าผิดรูปแบบกลายเป็นหน้า 1 */
export function parsePage(raw: unknown): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : 1;
}
