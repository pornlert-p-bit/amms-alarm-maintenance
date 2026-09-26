import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isAdmin, isRole, isStaff, type Role } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * DAL (Data Access Layer) ด้านตัวตนและสิทธิ์ — ด่านที่ 2 จาก 3 ด่าน
 *
 * ทุกหน้าและทุก Server Action ต้องเรียก requireUser / requireStaff / requireAdmin เอง
 * อย่าพึ่งการตรวจใน layout เพราะ Next.js ไม่รัน layout ใหม่ทุกครั้งที่เปลี่ยนหน้า
 * (เอกสาร Next.js 16: "Layouts and auth checks")
 */

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

/** สถานะของผู้ใช้ปัจจุบัน แยก "ยังไม่ Login" ออกจาก "Login แล้วแต่ไม่มีโปรไฟล์" */
type SessionState =
  | { kind: "anonymous" }
  | { kind: "no-profile"; userId: string }
  | { kind: "ok"; user: CurrentUser };

/**
 * อ่านผู้ใช้ปัจจุบันจาก session + ตาราง profiles
 * ห่อด้วย cache() ของ React → ใน 1 request เรียกกี่ครั้งก็ยิงฐานข้อมูลครั้งเดียว
 */
const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createSupabaseServerClient();

  // getUser() ถามเซิร์ฟเวอร์ Auth โดยตรง จึงรู้ด้วยถ้าบัญชีถูกลบ/ระงับไปแล้ว
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  // RLS อนุญาตให้ทุกคนอ่านโปรไฟล์ของตัวเองได้ (policy profiles_select_self_or_admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !isRole(profile.role)) {
    return { kind: "no-profile", userId: user.id };
  }

  return {
    kind: "ok",
    user: {
      id: user.id,
      email: user.email ?? "",
      fullName: profile.full_name,
      role: profile.role,
    },
  };
});

/** คืนผู้ใช้ปัจจุบัน หรือ null ถ้ายังไม่ Login / ไม่มีโปรไฟล์ — ใช้แสดงผลเท่านั้น ไม่ใช่ใช้ตรวจสิทธิ์ */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getSessionState();
  return state.kind === "ok" ? state.user : null;
}

/** ต้อง Login และมีโปรไฟล์ — ไม่งั้น redirect */
export async function requireUser(): Promise<CurrentUser> {
  const state = await getSessionState();
  if (state.kind === "anonymous") redirect("/login");
  // Login ได้แต่ไม่มีโปรไฟล์ (เช่นสร้างบัญชีก่อนรัน schema.sql) → ไปหน้าแจ้งเหตุ
  // ถ้าส่งกลับ /login จะวนลูป เพราะ proxy เห็นว่า Login แล้วจะส่งกลับมาที่ /dashboard อีก
  if (state.kind === "no-profile") redirect("/forbidden?reason=no-profile");
  return state.user;
}

/** ต้องเป็น Admin หรือ Technician (คนที่บันทึกข้อมูลงานได้) */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/forbidden");
  return user;
}

/** ต้องเป็น Admin เท่านั้น (REQ-SEC-02) */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/forbidden");
  return user;
}
