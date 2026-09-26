import { GroupBox } from "@/components/station/group-box";
import { PageTitle } from "@/components/station/page-title";

/** แสดงว่าหน้านี้กำลังพัฒนา — ใช้ชั่วคราวระหว่างทำทีละ Module และจะลบออกเมื่อหน้าเสร็จ */
export function ComingSoon({ title, due }: { title: string; due: string }) {
  return (
    <>
      <PageTitle title={title} />
      <GroupBox title="สถานะการพัฒนา">
        <p className="text-muted">อยู่ระหว่างพัฒนา — กำหนดเสร็จ {due}</p>
      </GroupBox>
    </>
  );
}
