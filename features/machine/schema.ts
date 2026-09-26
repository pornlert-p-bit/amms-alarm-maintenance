import { z } from "zod";

/**
 * กฎตรวจข้อมูลเครื่องจักร — ใช้ร่วมกันทั้งฝั่ง Browser และ Server (REQ-MCH-02…04, REQ-VAL-01…03)
 * ฐานข้อมูลมี Constraint ชุดเดียวกันซ้ำอีกชั้น (ADR-003) — ถ้าแก้กฎที่นี่ต้องแก้ supabase/schema.sql ให้ตรงกันด้วย
 */

/** ต้องตรงกับ enum machine_status ใน supabase/schema.sql */
export const MACHINE_STATUSES = ["Running", "Stop", "Alarm", "Maintenance"] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

/** ข้อความภาษาไทยของแต่ละช่อง — ใช้ทั้งใน schema และหน้าฟอร์ม */
const required = (label: string) => ({ error: `กรุณากรอก${label}` });

export const machineSchema = z.object({
  // รหัสเครื่อง: ตัดช่องว่าง + แปลงเป็นตัวพิมพ์ใหญ่เสมอ กัน "m-001" กับ "M-001" กลายเป็นคนละเครื่อง
  machine_id: z
    .string(required("รหัสเครื่องจักร"))
    .trim()
    .toUpperCase()
    .min(1, required("รหัสเครื่องจักร"))
    .regex(/^[A-Z0-9-]{2,20}$/, {
      error: "รหัสเครื่องจักรต้องเป็นตัวอักษรอังกฤษ ตัวเลข หรือขีด (-) ยาว 2–20 ตัว",
    }),
  machine_name: z
    .string(required("ชื่อเครื่องจักร"))
    .trim()
    .min(1, required("ชื่อเครื่องจักร"))
    .max(100, { error: "ชื่อเครื่องจักรยาวได้ไม่เกิน 100 ตัวอักษร" }),
  machine_type: z
    .string(required("ประเภทเครื่องจักร"))
    .trim()
    .min(1, required("ประเภทเครื่องจักร"))
    .max(50, { error: "ประเภทเครื่องจักรยาวได้ไม่เกิน 50 ตัวอักษร" }),
  location: z
    .string(required("ตำแหน่ง/ไลน์ผลิต"))
    .trim()
    .min(1, required("ตำแหน่ง/ไลน์ผลิต"))
    .max(100, { error: "ตำแหน่งยาวได้ไม่เกิน 100 ตัวอักษร" }),
  status: z.enum(MACHINE_STATUSES, { error: "กรุณาเลือกสถานะจากรายการ" }),
});

export type MachineInput = z.infer<typeof machineSchema>;
