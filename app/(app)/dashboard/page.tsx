import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "ภาพรวม" };

export default async function DashboardPage() {
  const user = await requireUser(); // ด่านที่ 2: ต้อง Login และมีโปรไฟล์

  return (
    <>
      <PageTitle title="ภาพรวมโรงงาน" sub={`ยินดีต้อนรับ ${user.fullName}`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <GroupBox title="สถานะเครื่องจักร">
          <p className="text-muted">ผังเครื่องจักรแยกตามไลน์ผลิต — กำหนดเสร็จ จ. 28 ก.ย.</p>
        </GroupBox>
        <GroupBox title="Alarm ล่าสุด">
          <p className="text-muted">รายการ Alarm ที่ยังไม่ปิด — กำหนดเสร็จ อา. 27 ก.ย.</p>
        </GroupBox>
        <GroupBox title="ตัวชี้วัด" className="lg:col-span-2">
          <p className="text-muted">MTTR, จำนวน Alarm ค้าง, งานซ่อมค้าง และกราฟ Pareto — กำหนดเสร็จ จ. 28 ก.ย.</p>
        </GroupBox>
      </div>
    </>
  );
}
