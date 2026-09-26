import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { tableClass } from "@/components/station/ui";
import { RoleForm } from "@/features/users/components/role-form";
import { getUsers } from "@/features/users/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "ผู้ใช้งาน" };

/** ป้าย Role — admin ใช้ขอบสีน้ำเงินให้เห็นว่าเป็นบัญชีสิทธิ์สูง ที่เหลือเป็นสีเทา */
const ROLE_CODE: Record<Role, { code: string; cls: string }> = {
  admin: { code: "ADMIN", cls: "border-accent bg-accent-soft text-accent" },
  technician: { code: "TECHNICIAN", cls: "border-line-strong bg-white text-neutral-ink" },
  viewer: { code: "VIEWER", cls: "border-line-strong bg-neutral text-neutral-ink" },
};

export default async function UsersPage() {
  // Admin เท่านั้น — Technician/Viewer ที่พิมพ์ URL นี้เองจะถูกส่งไป /forbidden (REQ-SEC-02)
  const me = await requireAdmin();
  const users = await getUsers();
  const count = (r: Role) => users.filter((u) => u.role === r).length;

  return (
    <>
      <PageTitle title="ผู้ใช้งาน" sub="จัดการสิทธิ์ (Role)" />

      <div className="space-y-6">
        <GroupBox title="รายชื่อผู้ใช้" aside={ROLES.map((r) => `${ROLE_CODE[r].code} ${count(r)}`).join(" · ")}>
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
              <thead>
                <tr>
                  <th className={tableClass.th}>ชื่อ</th>
                  <th className={tableClass.th}>Role ปัจจุบัน</th>
                  <th className={tableClass.th}>เข้าระบบครั้งแรก</th>
                  <th className={tableClass.th}>เปลี่ยน Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id} className={self ? "bg-accent-soft/30" : "hover:bg-accent-soft/20"}>
                      <td className={tableClass.td}>
                        {u.full_name}
                        {self && <span className="ml-1.5 text-xs text-muted">(คุณ)</span>}
                      </td>
                      <td className={tableClass.td}>
                        <span className={`inline-block rounded-[3px] border px-2 py-0.5 font-mono text-[11.5px] font-semibold ${ROLE_CODE[u.role].cls}`}>
                          {ROLE_CODE[u.role].code}
                        </span>
                        <span className="ml-2 text-xs text-ink-2">{ROLE_LABEL[u.role]}</span>
                      </td>
                      <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap`}>{formatDate(u.created_at)}</td>
                      <td className={tableClass.td}>
                        {self ? (
                          <span className="text-xs text-muted">เปลี่ยนของตัวเองไม่ได้ (REQ-AUTH-06)</span>
                        ) : (
                          <RoleForm userId={u.id} userName={u.full_name} current={u.role} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GroupBox>

        <GroupBox title="วิธีเพิ่มผู้ใช้ใหม่">
          <ol className="list-decimal space-y-1 pl-5 text-[13.5px] text-ink-2">
            <li>Supabase Dashboard → Authentication → Users → <b>Add user</b> (กรอกอีเมลและรหัสผ่าน)</li>
            <li>ผู้ใช้ใหม่จะได้ Role <b>VIEWER</b> อัตโนมัติ (REQ-AUTH-04) และขึ้นในตารางนี้ทันที</li>
            <li>เปลี่ยน Role ที่ตารางด้านบน — มีผลในคำขอถัดไปของผู้ใช้คนนั้น ไม่ต้อง Login ใหม่</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            ระบบไม่ได้สร้างบัญชีจากหน้าเว็บ เพราะต้องใช้ Secret key ของ Supabase ซึ่ง v1 ตั้งใจไม่เก็บไว้ในแอป (ลดความเสี่ยงถ้า server รั่ว)
          </p>
        </GroupBox>
      </div>
    </>
  );
}
