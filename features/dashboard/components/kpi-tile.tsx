import Link from "next/link";

/**
 * ช่องตัวเลขสรุปหนึ่งช่อง
 * tone ตามหลัก ISA-101: "neutral" = ปกติ (เทา) / "bad" = ต้องสนใจทันที (แดง) / "warn" = ต้องติดตาม (ส้ม)
 * ผู้เรียกต้องส่ง tone สีเฉพาะตอนค่าผิดปกติจริง เช่น Alarm ค้าง > 0 — ถ้าเป็น 0 ให้ส่ง neutral
 */
type Tone = "neutral" | "bad" | "warn";

const TONE: Record<Tone, { box: string; value: string }> = {
  neutral: { box: "border-line-strong bg-white", value: "text-ink" },
  bad: { box: "border-bad bg-bad-bg", value: "text-bad-ink" },
  warn: { box: "border-warn bg-warn-bg", value: "text-warn-ink" },
};

export function KpiTile({
  label,
  code,
  value,
  sub,
  tone = "neutral",
  href,
}: {
  label: string;
  /** รหัสสั้นภาษาอังกฤษแบบป้ายบนแผงควบคุม เช่น RUN, ALARM */
  code?: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
  href?: string;
}) {
  const t = TONE[tone];
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2 text-[12.5px] text-ink-2">
        <span>{label}</span>
        {code && <span className="font-mono text-[11px] font-semibold text-muted">{code}</span>}
      </div>
      {/* ตัวเลขใช้ตัวใหญ่ ส่วนข้อความยาว เช่น "1 ชม. 4 นาที" ลดขนาดลงไม่ให้ตกบรรทัด */}
      <div className={`mt-1 whitespace-nowrap font-mono font-semibold leading-tight tabular-nums ${typeof value === "number" ? "text-[26px]" : "text-[18px] leading-[33px]"} ${t.value}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-muted">{sub}</div>}
    </>
  );
  const cls = `block rounded-[3px] border px-3 py-2.5 ${t.box}`;
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-accent`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
