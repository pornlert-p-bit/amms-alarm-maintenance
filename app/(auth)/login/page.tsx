import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  // Next.js 16: searchParams เป็น Promise ต้อง await
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-lg font-bold text-amber-400">
            A
          </div>
          <h1 className="text-xl font-semibold">AMMS</h1>
          <p className="mt-1 text-sm text-slate-500">Alarm &amp; Maintenance Management System</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* ส่ง next ต่อให้ฟอร์มเป็น hidden input — server จะตรวจความปลอดภัยของค่านี้อีกครั้ง */}
          <LoginForm next={next ?? ""} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
        </p>
      </div>
    </main>
  );
}
