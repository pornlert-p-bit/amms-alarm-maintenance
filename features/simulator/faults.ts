import type { MachineStatus } from "@/features/machine/schema";

/**
 * รายการ Fault สำเร็จรูปของ PLC Simulator — ฟังก์ชันบริสุทธิ์ เขียน unit test ได้
 *
 * หน้าเว็บส่งแค่ "ลำดับของ Fault" มา ไม่ได้ส่งรหัส/ข้อความเอง
 * server จึงเป็นคนเลือกรหัสจากรายการนี้ — กันคนแก้ฟอร์มส่งข้อความแปลก ๆ เข้าระบบ
 * รหัสต้องตรงรูปแบบรหัส Alarm (ตัวใหญ่ ตัวเลข ขีด) เพราะเข้าตาราง alarms เหมือน Alarm ปกติ
 */
export type FaultPreset = { code: string; description: string };

const BY_TYPE: { match: string; faults: FaultPreset[] }[] = [
  { match: "cnc", faults: [
    { code: "E-101", description: "Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน" },
    { code: "E-105", description: "Coolant level low — น้ำหล่อเย็นต่ำ" },
  ] },
  { match: "injection", faults: [
    { code: "E-042", description: "Motor overtemperature — มอเตอร์ร้อนเกิน" },
    { code: "I-210", description: "Mold temperature deviation — อุณหภูมิแม่พิมพ์เบี่ยงเบน" },
  ] },
  { match: "conveyor", faults: [
    { code: "C-301", description: "Conveyor belt slip — สายพานลื่น ความเร็วตก" },
    { code: "C-305", description: "Jam sensor triggered — ชิ้นงานติดบนสายพาน" },
  ] },
  { match: "robot", faults: [
    { code: "R-401", description: "Torch collision detected — หัวเชื่อมชนชิ้นงาน" },
    { code: "R-410", description: "Wire feed fault — ป้อนลวดเชื่อมไม่สม่ำเสมอ" },
  ] },
  { match: "hydraulic", faults: [
    { code: "H-201", description: "Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ" },
    { code: "H-220", description: "Oil temperature high — น้ำมันไฮดรอลิกร้อนเกิน" },
  ] },
  { match: "pack", faults: [
    { code: "P-601", description: "Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่" },
    { code: "P-615", description: "Film roll empty — ฟิล์มหมดม้วน" },
  ] },
];

/** Fault ที่เกิดได้กับทุกเครื่อง (ต่อท้ายรายการของแต่ละประเภท) */
const COMMON: FaultPreset[] = [
  { code: "PLC-900", description: "Emergency stop pressed — มีการกดปุ่มหยุดฉุกเฉิน" },
  { code: "PLC-901", description: "Communication timeout — สัญญาณจากเครื่องขาดหาย" },
];

/** รายการ Fault ของเครื่องประเภทนี้ (จับคำในชื่อประเภท ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
export function faultsFor(machineType: string): FaultPreset[] {
  const type = machineType.toLowerCase();
  const own = BY_TYPE.find((t) => type.includes(t.match))?.faults ?? [];
  return [...own, ...COMMON];
}

/** หา Fault จากลำดับที่หน้าเว็บส่งมา — ค่าไม่ถูกต้องคืน null */
export function pickFault(machineType: string, index: unknown): FaultPreset | null {
  const i = typeof index === "string" && /^\d{1,2}$/.test(index) ? Number(index) : NaN;
  return faultsFor(machineType)[i] ?? null;
}

/** สถานะที่กดจำลองได้ตรง ๆ (Alarm ต้องเกิดผ่าน Fault เท่านั้น เพื่อให้มี Alarm Record คู่กันเสมอ) */
export const SIM_STATUSES = ["Running", "Stop", "Maintenance"] as const satisfies readonly MachineStatus[];
export type SimStatus = (typeof SIM_STATUSES)[number];

export function isSimStatus(value: unknown): value is SimStatus {
  return typeof value === "string" && (SIM_STATUSES as readonly string[]).includes(value);
}

/** Alarm ที่มาจาก Simulator ติด event_id ขึ้นต้นแบบนี้ (migration 009) */
export function isSimulatedAlarm(eventId: string | null | undefined): boolean {
  return typeof eventId === "string" && eventId.startsWith("sim-");
}
