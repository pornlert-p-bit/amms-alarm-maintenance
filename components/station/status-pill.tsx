/**
 * ป้ายสถานะแบบคู่ "หัวข้อ | ค่า" เหมือนแถบบนของ One Card Station
 * เช่น  [ฐานข้อมูล][ONLINE]   [PLC][SIMULATOR]
 *
 * tone บอกความหมาย ไม่ใช่แค่สี — ตามแนว ISA-101 ให้สถานะที่ไม่ต้องสนใจเป็นสีเทา (neutral)
 */
export type PillTone = "ok" | "bad" | "warn" | "accent" | "neutral";

const TONE_CLASS: Record<PillTone, string> = {
  ok: "bg-ok text-white",
  bad: "bg-bad text-white",
  warn: "bg-warn-bg text-warn-ink border border-warn",
  accent: "bg-accent text-white",
  neutral: "bg-neutral text-neutral-ink",
};

export function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: PillTone;
}) {
  return (
    <div className="inline-flex items-stretch gap-1 text-xs font-semibold">
      <span className="rounded-[3px] border border-line-strong bg-white px-2 py-1 text-ink">
        {label}
      </span>
      <span className={`rounded-[3px] px-2.5 py-1 ${TONE_CLASS[tone]}`}>{value}</span>
    </div>
  );
}
