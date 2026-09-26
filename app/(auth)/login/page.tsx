import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  // Next.js 16: searchParams เป็น Promise ต้อง await
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[52px] items-center gap-2 bg-top px-5 text-white">
        <span className="text-base font-bold tracking-tight">AMMS</span>
        <span className="text-[11px] text-top-ink">Alarm &amp; Maintenance Management System</span>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-sm">
          <GroupBox title="เข้าสู่ระบบ">
            {/* ส่ง next ต่อให้ฟอร์มเป็น hidden input — server จะตรวจความปลอดภัยของค่านี้อีกครั้ง */}
            <LoginForm next={next ?? ""} />
          </GroupBox>
          <p className="mt-4 text-center text-xs text-muted">
            ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
          </p>
        </div>
      </main>
    </div>
  );
}
