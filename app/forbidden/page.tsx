import type { Metadata } from "next";
import Link from "next/link";

import { GroupBox } from "@/components/station/group-box";
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
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[52px] items-center bg-top px-5 text-white">
        <span className="text-base font-bold tracking-tight">AMMS</span>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-md">
          <GroupBox title={noProfile ? "บัญชียังไม่พร้อมใช้งาน" : "ไม่มีสิทธิ์เข้าถึง"}>
            <p className="text-ink-2">
              {noProfile
                ? "บัญชีของคุณยังไม่มีข้อมูลโปรไฟล์ในระบบ กรุณาแจ้งผู้ดูแลระบบ"
                : "หน้านี้สงวนไว้สำหรับผู้ใช้ที่มีสิทธิ์สูงกว่า หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบ"}
            </p>
            <div className="mt-5 flex gap-2">
              {!noProfile && (
                <Link
                  href="/dashboard"
                  className="rounded-[3px] bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  กลับหน้าภาพรวม
                </Link>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-[3px] border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-panelhead"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </GroupBox>
        </div>
      </main>
    </div>
  );
}
