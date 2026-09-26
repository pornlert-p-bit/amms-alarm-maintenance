/**
 * กฎเรื่อง Role และเส้นทาง (route) ของระบบ — เขียนเป็นฟังก์ชันบริสุทธิ์ (pure function)
 * คือรับค่าเข้า → คืนค่าออก ไม่แตะฐานข้อมูล ไม่แตะ cookie
 * จึงเขียน unit test ได้ง่าย และใช้ร่วมกันได้ทั้ง proxy, หน้าเว็บ และเมนู
 *
 * อ้างอิง: docs/01-requirement-analysis.md §4.1 (REQ-AUTH-03) และ docs/02-system-design.md §7
 */

/** Role ทั้ง 3 ระดับ — ต้องตรงกับ enum `user_role` ใน supabase/schema.sql */
export const ROLES = ["admin", "technician", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "ผู้ดูแลระบบ",
  technician: "ช่างเทคนิค",
  viewer: "ผู้ติดตาม (ดูอย่างเดียว)",
};

/** ตรวจว่าค่าที่ได้มา (เช่นจากฐานข้อมูล) เป็น Role ที่ระบบรู้จักจริง */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Admin: จัดการ Machine, ผู้ใช้ และข้อมูลหลักได้ */
export function isAdmin(role: Role): boolean {
  return role === "admin";
}

/** Staff = คนที่ "เขียนข้อมูลงานได้" คือ Admin และ Technician (บันทึก Alarm / งานซ่อม) */
export function isStaff(role: Role): boolean {
  return role === "admin" || role === "technician";
}

/* ───────────────────────── เส้นทาง (Route) ───────────────────────── */

/** หน้าที่เข้าได้โดยไม่ต้อง Login */
const PUBLIC_PATHS = ["/login"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** หน้าที่ต้องการ Role Admin เท่านั้น */
const ADMIN_ONLY_PATHS = ["/users"];

/**
 * ผู้ใช้ Role นี้เปิดหน้านี้ได้หรือไม่
 * ใช้ตัดสินเมนูที่จะแสดง และใช้ในการตรวจของแต่ละหน้า
 * (หมายเหตุ: การซ่อนเมนูไม่ใช่ความปลอดภัย — ด่านจริงคือ requireAdmin() ในหน้า และ RLS ในฐานข้อมูล)
 */
export function canAccessPath(role: Role, pathname: string): boolean {
  const adminOnly = ADMIN_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return adminOnly ? isAdmin(role) : true;
}

/**
 * ป้องกันช่องโหว่ Open Redirect
 * หลัง Login ระบบจะพาผู้ใช้กลับไปหน้าที่ตั้งใจจะเปิด (?next=/alarms)
 * ถ้าไม่ตรวจค่า คนร้ายอาจส่งลิงก์ ?next=https://เว็บปลอม ให้เหยื่อ แล้วเหยื่อ Login เสร็จจะถูกพาไปเว็บปลอม
 * กติกา: ยอมรับเฉพาะ path ภายในเว็บเรา ที่ขึ้นต้นด้วย "/" ตัวเดียว
 */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback; // ต้องเป็น path ภายใน
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback; // //evil.com = ไปโดเมนอื่น
  if (isPublicPath(next)) return fallback; // ไม่พากลับไปหน้า login วนซ้ำ
  return next;
}

/* ───────────────────────── เมนู ───────────────────────── */

export type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม" },
  { href: "/machines", label: "เครื่องจักร" },
  { href: "/alarms", label: "Alarm" },
  { href: "/maintenance", label: "งานซ่อมบำรุง" },
  { href: "/users", label: "ผู้ใช้งาน" },
];

/** เมนูที่ Role นี้ควรเห็น */
export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessPath(role, item.href));
}
