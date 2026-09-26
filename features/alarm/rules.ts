import type { AlarmStatus } from "./schema";

/**
 * กฎการเปลี่ยนสถานะ Alarm (BR-02) — ตาม State Machine ใน docs/02-system-design.md §4
 *
 *   Open ──► In Progress ──► Closed
 *     └──────────────────────►┘
 *
 * ห้ามย้อนกลับ และ Closed คือสถานะสุดท้าย (REQ-ALM-05)
 * กฎนี้อยู่ที่ server (ไม่ใช่ CHECK ในฐานข้อมูล) เพราะต้องรู้ค่าเดิมก่อนเปลี่ยน — เหตุผลใน ADR-003 ข้อ 3
 */
const ALLOWED: Record<AlarmStatus, AlarmStatus[]> = {
  Open: ["In Progress", "Closed"],
  "In Progress": ["Closed"],
  Closed: [],
};

export function allowedAlarmTransition(from: AlarmStatus, to: AlarmStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** สถานะถัดไปที่เลือกได้ — ใช้ตัดสินว่าจะแสดงปุ่มอะไรในหน้า */
export function nextAlarmStatuses(from: AlarmStatus): AlarmStatus[] {
  return ALLOWED[from];
}

export const ALARM_STATUS_LABEL: Record<AlarmStatus, string> = {
  Open: "ยังไม่มีผู้รับ",
  "In Progress": "กำลังแก้ไข",
  Closed: "ปิดแล้ว",
};
