import { SidebarNav } from "@/components/sidebar-nav";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { navItemsFor, ROLE_LABEL } from "@/lib/auth/roles";

/**
 * โครงหน้าหลักของระบบ (เมนูด้านข้าง + ชื่อผู้ใช้ + ปุ่มออกจากระบบ)
 *
 * ⚠️ Layout นี้ "แสดงผล" เท่านั้น ไม่ใช่ด่านตรวจสิทธิ์
 * เพราะ Next.js ไม่รัน layout ใหม่ทุกครั้งที่เปลี่ยนหน้า — ทุก page ข้างในต้องเรียก
 * requireUser()/requireAdmin() เอง (ดู lib/auth/dal.ts)
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-4 bg-slate-900 p-4 md:min-h-screen md:w-60 md:shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-400 text-sm font-bold text-slate-900">
            A
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">AMMS</div>
            <div className="text-[11px] text-slate-400">Alarm &amp; Maintenance</div>
          </div>
        </div>

        {user && <SidebarNav items={navItemsFor(user.role)} />}

        {user && (
          <div className="mt-auto border-t border-slate-800 pt-4">
            <div className="truncate text-sm text-white">{user.fullName}</div>
            <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        )}
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
