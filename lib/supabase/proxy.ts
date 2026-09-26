import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/env";

/**
 * ต่ออายุ session ของ Supabase ในทุก request แล้วบอกว่าผู้ใช้ Login อยู่หรือไม่
 *
 * ทำไมต้องมี: token ของ Supabase หมดอายุเป็นระยะ ถ้าไม่มีจุดกลางคอย refresh
 * หน้าเว็บฝั่ง server จะอ่าน session ไม่ได้และเด้งผู้ใช้ออกกลางคัน (Failure Mode FM-03)
 *
 * คืนค่า:
 *  - response : NextResponse ที่มี cookie ใหม่ (ถ้ามีการต่ออายุ) — ต้องส่งต่อให้ browser
 *  - isLoggedIn : true ถ้า token ถูกต้อง (ตรวจลายเซ็นแล้ว ไม่ใช่แค่ดูว่ามี cookie)
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 1) ใส่ cookie ใหม่ใน request เพื่อให้หน้าเว็บที่รันต่อจากนี้เห็น session ล่าสุด
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // 2) ใส่ cookie ใหม่ใน response เพื่อให้ browser เก็บไว้
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // 3) header กัน CDN แคชหน้าที่มี cookie ของผู้ใช้ (ไม่งั้น session ของคนหนึ่งอาจถูกส่งให้อีกคน)
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // สำคัญ: อย่าแทรกโค้ดใด ๆ ระหว่าง createServerClient กับบรรทัดนี้ (ข้อกำหนดของ @supabase/ssr)
  // getClaims() ตรวจลายเซ็นของ token จริง จึงเชื่อได้มากกว่าการดูว่ามี cookie หรือไม่
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  return { response, isLoggedIn };
}

/**
 * สร้าง redirect โดย "พก cookie ที่เพิ่งต่ออายุไปด้วย"
 * ถ้าไม่คัดลอก cookie ข้ามไป session ใหม่จะหายระหว่างทาง และผู้ใช้จะหลุด Login
 */
export function redirectWithCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") redirect.headers.set(key, value);
  });
  return redirect;
}
