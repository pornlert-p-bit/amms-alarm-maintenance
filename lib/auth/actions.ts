"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/auth/schema";
import { maskEmail } from "@/lib/mask";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server Action ของการ Login / Logout
 * "use server" บนสุดของไฟล์ = ทุกฟังก์ชันในไฟล์นี้รันบน server เท่านั้น
 * Browser เรียกได้ผ่านฟอร์ม แต่มองไม่เห็นโค้ดข้างใน
 */

export type LoginState = {
  /** ข้อความผิดพลาดรวม (เช่น รหัสผิด) */
  error?: string;
  /** ข้อความผิดพลาดรายช่อง เพื่อแสดงใต้ input */
  fieldErrors?: { email?: string[]; password?: string[] };
  /** คืนอีเมลกลับไป เพื่อไม่ให้ผู้ใช้ต้องพิมพ์ใหม่เมื่อ Login ไม่สำเร็จ (NFR-USE-01) */
  email?: string;
};

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const typedEmail = typeof raw.email === "string" ? raw.email : "";

  // 1) ตรวจรูปแบบข้อมูลฝั่ง server ซ้ำ — ไม่เชื่อว่า Browser ตรวจมาแล้ว
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email: typedEmail };
  }

  // 2) ให้ Supabase ตรวจอีเมล/รหัสผ่าน แล้วเขียน session ลง cookie
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // log แบบปิดบังอีเมล และไม่เขียนรหัสผ่านลง log เด็ดขาด
    console.warn(
      `signIn failed: email=${maskEmail(parsed.data.email)}, code=${error.code ?? "unknown"}, status=${error.status ?? "-"}`,
    );
    return { error: loginErrorMessage(error.code), email: parsed.data.email };
  }

  // 3) สำเร็จ → กลับไปหน้าที่ตั้งใจจะเปิด (ตรวจกัน Open Redirect แล้ว)
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * แปลรหัสข้อผิดพลาดของ Supabase เป็นข้อความสำหรับผู้ใช้
 * กรณีรหัสผิด ตั้งใจไม่บอกว่า "อีเมลนี้ไม่มีในระบบ" เพื่อไม่ให้คนนอกใช้ทดลองเดาอีเมลพนักงาน
 */
function loginErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "บัญชียังไม่ได้ยืนยันอีเมล — กรุณาแจ้งผู้ดูแลระบบ";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    default:
      return "เข้าสู่ระบบไม่สำเร็จ ระบบอาจขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
  }
}
