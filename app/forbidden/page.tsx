import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "ไม่มีสิทธิ์เข้าถึง" };

type Props = { searchParams: Promise<{ reason?: string }> };

/**
 * หน้าแจ้งว่าไม่มีสิทธิ์ — ตั้งใจวางไว้ "นอก" กลุ่ม (app)
 * เพื่อไม่ต้องพึ่ง layout ที่ต้องมีโปรไฟล์ผู้ใช้ (กันการ redirect วนลูปกรณีบัญชีไม่มีโปรไฟล์)
 */
export default async function ForbiddenPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const noProfile = reason === "no-profile";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">
          {noProfile ? "บัญชีนี้ยังไม่พร้อมใช้งาน" : "ไม่มีสิทธิ์เข้าถึงหน้านี้"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {noProfile
            ? "บัญชีของคุณยังไม่มีข้อมูลโปรไฟล์ในระบบ กรุณาแจ้งผู้ดูแลระบบ"
            : "หน้านี้สงวนไว้สำหรับผู้ใช้ที่มีสิทธิ์สูงกว่า หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบ"}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!noProfile && (
            <Link href="/dashboard" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
              กลับแดชบอร์ด
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
