/** หัวหน้าเพจ: ชื่อหน้า + คำอธิบายสั้น (ตามรูปแบบ .oc-ptitle ของ One Card) */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

/**
 * หัวหน้าเพจที่มีปุ่มด้านขวา (เช่น "+ บันทึก Alarm", "‹ กลับรายการ")
 * จอกว้าง: ปุ่มอยู่ขวาของชื่อหน้า / จอมือถือ: ปุ่มตกลงบรรทัดใหม่
 * ปุ่มมีระยะห่างด้านล่างของตัวเอง (mb-5) — ไม่งั้นบนมือถือปุ่มจะชิดทับหัวกรอบ GroupBox ถัดไป
 */
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3">
      <PageTitle title={title} sub={sub} />
      {children && <div className="mb-5 flex flex-wrap items-start gap-2">{children}</div>}
    </div>
  );
}
