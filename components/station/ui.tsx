/**
 * ชิ้นส่วนหน้าจอพื้นฐานของธีม Station terminal ที่ใช้ซ้ำทุก module
 * ไม่มี state จึงใช้ได้ทั้งใน Server และ Client Component
 */

/* ─────────── ปุ่ม ─────────── */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-[3px] px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70";

export const buttonClass = {
  /** ปุ่มหลัก — ใช้ได้หน้าละ 1 จุด */
  primary: `${BUTTON_BASE} bg-accent text-white hover:bg-accent-hover`,
  /** ปุ่มรอง */
  secondary: `${BUTTON_BASE} border border-line-strong bg-white text-ink hover:bg-panelhead`,
  /** ปุ่มที่ทำลายข้อมูล (ลบ) — สีแดงเฉพาะตอนชี้ ตามหลักไม่ใช้สีแดงพร่ำเพรื่อ */
  danger: `${BUTTON_BASE} border border-line-strong bg-white text-bad-ink hover:border-bad hover:bg-bad-bg`,
  /** ปุ่มเล็กในตาราง */
  small: "inline-flex items-center rounded-[3px] border border-line-strong bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent hover:text-accent",
};

/* ─────────── แถบแจ้งผล ─────────── */

export function Notice({ tone, children }: { tone: "ok" | "bad" | "info"; children: React.ReactNode }) {
  const cls = {
    ok: "border-ok bg-ok-bg text-ok",
    bad: "border-bad bg-bad-bg text-bad-ink",
    info: "border-accent bg-accent-soft text-accent",
  }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`mb-4 rounded-[3px] border px-3 py-2 text-[13px] ${cls}`}>
      {children}
    </div>
  );
}

/* ─────────── ช่องกรอกฟอร์ม ─────────── */

const INPUT_BASE =
  "w-full rounded-[3px] border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

/** กรอบของช่องกรอก: ป้ายชื่อ (มีจุดนำหน้าแบบ One Card — จุดแดง = ช่องบังคับ) + ข้อความผิดพลาดใต้ช่อง */
export function FieldShell({ id, label, required, hint, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-2 text-[13.5px] text-ink-2">
        <span aria-hidden="true" className={`h-[5px] w-[5px] shrink-0 rounded-full ${required ? "bg-bad" : "bg-accent"}`} />
        {label}
        {required && <span className="sr-only">(จำเป็น)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-bad-ink">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function inputClass(hasError: boolean, extra = "") {
  return `${INPUT_BASE} ${hasError ? "border-bad" : "border-line-strong"} ${extra}`;
}

/* ─────────── ตาราง ─────────── */

export const tableClass = {
  /**
   * ต้องมี relative: ข้อความ sr-only ในป้ายสถานะเป็น position:absolute ถ้ากรอบไม่ใช่ relative
   * มันจะหลุดออกนอกกรอบที่เลื่อนได้ และทำให้ทั้งหน้ากว้างเกินจอบนมือถือ
   */
  wrap: "relative overflow-x-auto rounded-[3px] border border-line",
  table: "w-full border-collapse text-[13.5px]",
  th: "whitespace-nowrap border-b border-line bg-panelhead px-3 py-2 text-left text-xs font-semibold text-ink-2",
  td: "border-b border-line px-3 py-2 align-middle",
  mono: "font-mono text-[13px] tabular-nums",
};
