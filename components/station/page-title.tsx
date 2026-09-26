/** หัวหน้าเพจ: ชื่อหน้า + คำอธิบายสั้น (ตามรูปแบบ .oc-ptitle ของ One Card) */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
    </div>
  );
}
