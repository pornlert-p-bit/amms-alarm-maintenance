/**
 * GroupBox — กรอบที่มีหัวข้อฝังอยู่บนเส้นขอบ (เอกลักษณ์ของหน้าจอแบบ Station terminal)
 * ใช้ครอบเนื้อหาแต่ละส่วนของหน้า เช่น "สถานะเครื่องจักร", "Alarm ล่าสุด"
 *
 * ใช้ <section> + <h2> แทน <fieldset> เพราะ fieldset มีความหมายว่า "กลุ่มช่องกรอกฟอร์ม"
 * ถ้าใช้กับเนื้อหาที่แสดงผลอย่างเดียว โปรแกรมอ่านหน้าจอจะอ่านความหมายผิด
 */
type Props = {
  title: string;
  /** ข้อความเล็กชิดขวาบนเส้นขอบ เช่น จำนวนรายการ */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function GroupBox({ title, aside, className = "", children }: Props) {
  const headingId = `gb-${title.replace(/\s+/g, "-")}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`relative rounded border border-line-strong bg-white px-4 pb-4 pt-5 ${className}`}
    >
      <h2
        id={headingId}
        className="groupbox-title absolute -top-[0.7em] left-3 px-1.5 text-[13px] font-semibold text-ink"
      >
        {title}
      </h2>
      {aside && (
        <div className="groupbox-title absolute -top-[0.7em] right-3 px-1.5 text-xs text-muted">
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
