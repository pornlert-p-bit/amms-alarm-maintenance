import type { MntStatus } from "./schema";

/**
 * กฎการเปลี่ยนสถานะงานซ่อม — ตาม State Machine ใน docs/02-system-design.md §4
 *
 *   Open ──► In Progress ──► Done
 *                ▲  │
 *                │  ▼
 *            Waiting Part   (รออะไหล่ แล้วกลับมาซ่อมต่อ)
 *
 * ต้องตรงกับ trigger enforce_maintenance_update ใน migration 005 — ถ้าแก้ที่หนึ่งต้องแก้อีกที่
 */
const ALLOWED: Record<MntStatus, MntStatus[]> = {
  Open: ["In Progress"],
  "In Progress": ["Waiting Part", "Done"],
  "Waiting Part": ["In Progress"],
  Done: [],
};

export function allowedMntTransition(from: MntStatus, to: MntStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function nextMntStatuses(from: MntStatus): MntStatus[] {
  return ALLOWED[from];
}

export const MNT_STATUS_LABEL: Record<MntStatus, string> = {
  Open: "รอเริ่มงาน",
  "In Progress": "กำลังซ่อม",
  "Waiting Part": "รออะไหล่",
  Done: "เสร็จแล้ว",
};

/** ข้อความบนปุ่มเปลี่ยนสถานะ (มาจากสถานะปัจจุบัน → สถานะปลายทาง) */
export function transitionLabel(from: MntStatus, to: MntStatus): string {
  if (to === "In Progress") return from === "Waiting Part" ? "อะไหล่มาแล้ว — ซ่อมต่อ" : "เริ่มซ่อม";
  if (to === "Waiting Part") return "รออะไหล่";
  if (to === "Done") return "ปิดงาน";
  return to;
}
