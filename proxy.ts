import type { NextRequest } from "next/server";

import { isPublicPath } from "@/lib/auth/roles";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next.js 16 เปลี่ยนชื่อจาก middleware) — ด่านที่ 1 จาก 3 ด่าน
 *
 * ทำ 2 อย่างเท่านั้น:
 *  1. ต่ออายุ session ของ Supabase ทุก request
 *  2. ตรวจ "เบื้องต้น" ว่า Login หรือยัง แล้ว redirect ให้เหมาะสม
 *
 * สิ่งที่ proxy ตั้งใจ "ไม่ทำ": ตรวจ Role
 * เพราะต้องอ่านตาราง profiles ในฐานข้อมูล ซึ่งเอกสาร Next.js 16 แนะนำให้เลี่ยงใน proxy
 * (proxy รันทุก request รวมถึงตอน prefetch) — การตรวจ Role จริงอยู่ที่ด่าน 2 (requireAdmin ใน
 * lib/auth/dal.ts) และด่าน 3 (RLS ในฐานข้อมูล)
 */
export async function proxy(request: NextRequest) {
  const { response, isLoggedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // ยังไม่ Login แต่จะเข้าหน้าภายใน → ไปหน้า Login พร้อมจำหน้าที่ตั้งใจจะไป (REQ-SEC-01)
  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return redirectWithCookies(loginUrl, response);
  }

  // Login แล้วแต่เปิดหน้า Login อีก → พาไปแดชบอร์ด
  if (isLoggedIn && isPublicPath(pathname)) {
    return redirectWithCookies(new URL("/dashboard", request.url), response);
  }

  return response;
}

export const config = {
  // รันทุกเส้นทาง ยกเว้นไฟล์ static ของ Next.js และไฟล์รูป (ไม่ต้องเช็ค session)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
