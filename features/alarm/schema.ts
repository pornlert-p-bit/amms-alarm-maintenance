import { z } from "zod";

import { parseBangkokLocal } from "@/lib/format";

/**
 * กฎตรวจข้อมูล Alarm (REQ-ALM-01…05, REQ-VAL-04)
 * ฐานข้อมูลมีกฎซ้ำอีกชั้น: CHECK alarms_closed_requires_cause และ trigger ตรวจเวลาไม่เป็นอนาคต
 */

/** ต้องตรงกับ enum alarm_status ใน supabase/schema.sql */
export const ALARM_STATUSES = ["Open", "In Progress", "Closed"] as const;
export type AlarmStatus = (typeof ALARM_STATUSES)[number];

/** เผื่อนาฬิกาเครื่องผู้ใช้กับ server ไม่ตรงกันเล็กน้อย — ต้องตรงกับ trigger ใน schema.sql (1 นาที) */
const CLOCK_SKEW_MS = 60_000;

/** เวลาเกิดเหตุต้องไม่เป็นอนาคต (BR-08) — รับ now จากภายนอกเพื่อให้เขียน test ได้ */
export function isNotFuture(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime() + CLOCK_SKEW_MS;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const alarmCreateSchema = z.object({
  machine_id: z
    .string({ error: "กรุณาเลือกเครื่องจักร" })
    .regex(UUID, { error: "กรุณาเลือกเครื่องจักรจากรายการ" }),
  alarm_code: z
    .string({ error: "กรุณากรอกรหัส Alarm" })
    .trim()
    .toUpperCase()
    .min(1, { error: "กรุณากรอกรหัส Alarm" })
    .regex(/^[A-Z0-9-]{1,30}$/, { error: "รหัส Alarm ต้องเป็นตัวอักษรอังกฤษ ตัวเลข หรือขีด (-) ไม่เกิน 30 ตัว" }),
  description: z
    .string({ error: "กรุณากรอกรายละเอียด" })
    .trim()
    .min(1, { error: "กรุณากรอกรายละเอียด" })
    .max(500, { error: "รายละเอียดยาวได้ไม่เกิน 500 ตัวอักษร" }),
  // รับค่าจากช่อง datetime-local (เวลาไทย) แล้วแปลงเป็น ISO ที่มีโซนเวลา
  occurred_at: z
    .string({ error: "กรุณาระบุวันเวลาที่เกิด Alarm" })
    .transform((v, ctx) => {
      const iso = parseBangkokLocal(v);
      if (!iso) {
        ctx.addIssue({ code: "custom", message: "กรุณาระบุวันเวลาที่เกิด Alarm ให้ถูกต้อง" });
        return z.NEVER;
      }
      return iso;
    })
    .refine((iso) => isNotFuture(iso), { error: "วันเวลาที่เกิด Alarm ต้องไม่เป็นเวลาในอนาคต" }),
});

export type AlarmCreateInput = z.infer<typeof alarmCreateSchema>;

/** แก้รายละเอียด Alarm ที่ยังไม่ปิด — เปลี่ยนเครื่องจักรไม่ได้ (trigger ในฐานข้อมูลก็ห้าม) */
export const alarmEditSchema = alarmCreateSchema.omit({ machine_id: true });

/** ปิด Alarm ต้องระบุสาเหตุ (REQ-ALM-03, BR-03) */
export const alarmCloseSchema = z.object({
  cause: z
    .string({ error: "กรุณาระบุสาเหตุก่อนปิด Alarm" })
    .trim()
    .min(1, { error: "กรุณาระบุสาเหตุก่อนปิด Alarm" })
    .max(500, { error: "สาเหตุยาวได้ไม่เกิน 500 ตัวอักษร" }),
});
