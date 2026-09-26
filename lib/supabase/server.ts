import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/env";

/**
 * สร้าง Supabase client สำหรับฝั่ง Server (Server Component, Server Action, Route Handler)
 *
 * - ใช้ Publishable key + session ของผู้ใช้จาก cookie
 *   → ทุก query ทำงาน "ในนามผู้ใช้คนนั้น" ทำให้ RLS ในฐานข้อมูลตรวจสิทธิ์ได้ (ADR-002)
 * - ไม่ใช้ Secret/Service Role key ที่นี่ เพราะ key นั้นข้าม RLS ทั้งหมด
 * - ต้องสร้างใหม่ทุก request ห้ามเก็บไว้ใช้ซ้ำ (ข้อกำหนดของ @supabase/ssr)
 *
 * บรรทัด import "server-only" ทำให้ build พังทันทีถ้ามีใครเผลอ import ไฟล์นี้จากฝั่ง Browser
 */
export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  const cookieStore = await cookies(); // Next.js 16: cookies() เป็น async ต้อง await

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component เขียน cookie ไม่ได้ (อ่านได้อย่างเดียว) — ปล่อยผ่านได้
          // เพราะ proxy.ts ทำหน้าที่ต่ออายุ session และเขียน cookie ให้แล้วทุก request
        }
      },
    },
  });
}
