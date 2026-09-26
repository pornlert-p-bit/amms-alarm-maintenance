import { z } from "zod";

/**
 * กฎตรวจฟอร์ม Login — ไฟล์นี้ไม่มีโค้ดฝั่ง server จึงใช้ได้ทั้ง Browser และ Server
 * (REQ-VAL-01 ห้ามว่าง, REQ-VAL-03 ข้อความภาษาไทยระบุช่องที่ผิด)
 */
export const loginSchema = z.object({
  email: z
    .string({ error: "กรุณากรอกอีเมล" })
    .trim()
    .min(1, { error: "กรุณากรอกอีเมล" })
    .pipe(z.email({ error: "รูปแบบอีเมลไม่ถูกต้อง" })),
  password: z
    .string({ error: "กรุณากรอกรหัสผ่าน" })
    .min(1, { error: "กรุณากรอกรหัสผ่าน" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
