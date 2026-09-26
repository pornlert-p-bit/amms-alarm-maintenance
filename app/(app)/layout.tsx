import { ShiftClock } from "@/components/station/shift-clock";
import { StatusPill } from "@/components/station/status-pill";
import { TopNav } from "@/components/station/top-nav";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { navItemsFor, ROLE_LABEL, type Role } from "@/lib/auth/roles";

/**
 * โครงหน้าหลักแบบ "Station terminal" (ต่อยอดจากโหมด kiosk ของ One Card)
 *   1. แถบบนสีเข้ม: ชื่อระบบ + เมนู + ผู้ใช้/ออกจากระบบ
 *   2. แถวป้ายสถานะ: ฐานข้อมูล / PLC / สิทธิ์ / กะ / นาฬิกา
 *   3. พื้นที่ทำงานสีเทาอ่อน
 *
 * ⚠️ Layout นี้ "แสดงผล" เท่านั้น ไม่ใช่ด่านตรวจสิทธิ์
 * Next.js ไม่รัน layout ใหม่ทุกครั้งที่เปลี่ยนหน้า — ทุก page ข้างในต้องเรียก require*() เอง (lib/auth/dal.ts)
 */

/** ป้ายสิทธิ์เป็นภาษาอังกฤษตัวใหญ่ให้เข้ากับป้ายอื่นในแถบ ส่วนชื่อเต็มภาษาไทยอยู่ที่มุมขวาบน */
const ROLE_CODE: Record<Role, string> = {
  admin: "ADMIN",
  technician: "TECHNICIAN",
  viewer: "VIEWER",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      {/* 1. แถบบน */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center gap-6 bg-top px-4 text-white md:px-5">
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-base font-bold tracking-tight">AMMS</span>
          <span className="hidden text-[11px] text-top-ink lg:inline">Alarm &amp; Maintenance</span>
        </div>

        {user && <TopNav items={navItemsFor(user.role)} />}

        {user && (
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[12.5px] font-semibold">{user.fullName}</div>
              <div className="text-[11px] text-top-ink">{ROLE_LABEL[user.role]}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-[3px] border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        )}
      </header>

      {/* 2. แถวป้ายสถานะ */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 md:px-5">
        {/* ถ้าอ่านโปรไฟล์จากฐานข้อมูลได้ แปลว่าเชื่อมต่อฐานข้อมูลได้จริง — ไม่ใช่ป้ายตกแต่ง */}
        <StatusPill label="ฐานข้อมูล" value={user ? "ONLINE" : "OFFLINE"} tone={user ? "ok" : "bad"} />
        {/* v1 ยังไม่เชื่อม PLC จริง (ADR-004) — แสดงตามจริงด้วยสีเทา */}
        <StatusPill label="PLC" value="SIMULATOR" tone="neutral" />
        {user && <StatusPill label="สิทธิ์" value={ROLE_CODE[user.role]} tone="neutral" />}
        <ShiftClock />
      </div>

      {/* 3. พื้นที่ทำงาน */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-5">{children}</main>
    </div>
  );
}
