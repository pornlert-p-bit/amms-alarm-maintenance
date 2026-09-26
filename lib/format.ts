/**
 * แปลง/แสดงวันเวลาแบบ "เวลาไทย" เสมอ
 *
 * ทำไมต้องมีไฟล์นี้: server ของ Vercel ใช้เวลา UTC ถ้าใช้ new Date().toLocaleString() ตรง ๆ
 * เวลาที่แสดงจะช้าไป 7 ชั่วโมง — ทุกจุดที่แสดงหรือรับเวลาต้องผ่านฟังก์ชันในไฟล์นี้
 */
const TZ = "Asia/Bangkok";
const BANGKOK_OFFSET = "+07:00"; // ประเทศไทยไม่มีการปรับเวลาฤดูร้อน ค่านี้จึงคงที่

const dateTimeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "26 ก.ย. 2569 10:44" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

/** "26 ก.ย. 2569" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

/**
 * ค่าจากช่อง <input type="datetime-local"> เช่น "2026-09-26T10:30" ไม่มีโซนเวลา
 * ตีความว่าเป็นเวลาไทย แล้วคืนค่าเป็น ISO ที่มีโซนเวลาชัดเจน — คืน null ถ้ารูปแบบไม่ถูกต้อง
 */
export function parseBangkokLocal(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${withSeconds}${BANGKOK_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** แปลงเวลา ISO เป็นค่าที่ใส่ใน <input type="datetime-local"> ได้ (เวลาไทย) */
export function toBangkokLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** วันที่แบบ YYYY-MM-DD (ใช้กับ filter ช่วงวันที่) → ขอบเขตต้น/ท้ายวันตามเวลาไทย เป็น ISO */
export function bangkokDayRange(day: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00${BANGKOK_OFFSET}`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}
