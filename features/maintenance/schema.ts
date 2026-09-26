import { z } from "zod";

import { parseBangkokLocal } from "@/lib/format";

/**
 * กฎตรวจข้อมูลงานซ่อมบำรุง (REQ-MNT-01…05, REQ-BON-07)
 * ฐานข้อมูลบังคับซ้ำอีกชั้น: CHECK mnt_done_requires_action + trigger ใน migration 005
 */

/** ต้องตรงกับ enum mnt_status ใน supabase/schema.sql */
export const MNT_STATUSES = ["Open", "In Progress", "Waiting Part", "Done"] as const;
export type MntStatus = (typeof MNT_STATUSES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ช่องเลือกที่ไม่บังคับ: ค่าว่าง = ไม่เลือก (null) */
const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || UUID.test(v), { error: "ค่าที่เลือกไม่ถูกต้อง" });

/** วันเวลาเข้าซ่อม — อนุญาตเวลาในอนาคตได้ เพราะงานซ่อมวางแผนล่วงหน้า (PM) ได้ */
const maintainedAt = z.string({ error: "กรุณาระบุวันเวลาเข้าซ่อม" }).transform((v, ctx) => {
  const iso = parseBangkokLocal(v);
  if (!iso) {
    ctx.addIssue({ code: "custom", message: "กรุณาระบุวันเวลาเข้าซ่อมให้ถูกต้อง" });
    return z.NEVER;
  }
  return iso;
});

const technician = z
  .string({ error: "กรุณาเลือกช่างผู้รับผิดชอบ" })
  .regex(UUID, { error: "กรุณาเลือกช่างผู้รับผิดชอบจากรายการ" });

const problem = z
  .string({ error: "กรุณากรอกปัญหาที่พบ" })
  .trim()
  .min(1, { error: "กรุณากรอกปัญหาที่พบ" })
  .max(500, { error: "ปัญหาที่พบยาวได้ไม่เกิน 500 ตัวอักษร" });

export const mntCreateSchema = z.object({
  machine_id: z.string({ error: "กรุณาเลือกเครื่องจักร" }).regex(UUID, { error: "กรุณาเลือกเครื่องจักรจากรายการ" }),
  alarm_id: optionalUuid, // ใบงานซ่อมอาจไม่ได้มาจาก Alarm (เช่นงาน PM) — REQ-MNT-02
  technician_id: technician,
  problem,
  maintained_at: maintainedAt,
});

/** แก้รายละเอียดใบงานที่ยังไม่ Done — เปลี่ยนเครื่องจักร/Alarm ไม่ได้ (trigger ก็ห้าม) */
export const mntEditSchema = z.object({
  technician_id: technician,
  problem,
  maintained_at: maintainedAt,
});

/** ปิดงาน (Done) ต้องบันทึกสิ่งที่ทำ — REQ-MNT-04, BR-04 */
export const mntDoneSchema = z.object({
  action_taken: z
    .string({ error: "กรุณาบันทึกการแก้ไขก่อนปิดงาน" })
    .trim()
    .min(1, { error: "กรุณาบันทึกการแก้ไขก่อนปิดงาน" })
    .max(1000, { error: "การแก้ไขยาวได้ไม่เกิน 1000 ตัวอักษร" }),
});
