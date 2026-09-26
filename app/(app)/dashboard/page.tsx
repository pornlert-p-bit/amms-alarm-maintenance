import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABEL } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "แดชบอร์ด" };

export default async function DashboardPage() {
  const user = await requireUser(); // ด่านที่ 2: ต้อง Login และมีโปรไฟล์

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-slate-500">
          ยินดีต้อนรับ {user.fullName} — สิทธิ์ของคุณ: {ROLE_LABEL[user.role]}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          การ์ดสรุปสถานะเครื่องจักร, จำนวน Alarm/งานซ่อมค้าง และกราฟ — กำหนดเสร็จ จ. 28 ก.ย.
        </p>
      </div>
    </div>
  );
}
