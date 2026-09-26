"use client";

import { useEffect, useState } from "react";

import { shiftOfHour, type Shift } from "@/lib/shift";

import { StatusPill } from "./status-pill";

/**
 * ป้าย "กะ" + นาฬิกาเดินจริง ในแถบสถานะ
 *
 * - ใช้เวลาไทย (Asia/Bangkok) เสมอ ไม่ว่าเครื่องที่เปิดจะตั้งโซนเวลาอะไรไว้
 * - ตอนหน้าเว็บถูกสร้างบน server ยังไม่รู้เวลาของผู้ใช้ จึงแสดง --:--:-- ก่อน
 *   แล้วค่อยเริ่มเดินเมื่อโหลดใน browser (กัน error "hydration mismatch" ที่ HTML จาก server กับ browser ไม่ตรงกัน)
 */
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function readBangkokNow(): { text: string; shift: Shift } {
  const parts = timeFormat.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return { text: timeFormat.format(new Date()), shift: shiftOfHour(hour) };
}

export function ShiftClock() {
  const [now, setNow] = useState<{ text: string; shift: Shift } | null>(null);

  useEffect(() => {
    const tick = () => setNow(readBangkokNow());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id); // ออกจากหน้าแล้วหยุดนาฬิกา ไม่ให้ค้างทำงานเบื้องหลัง
  }, []);

  return (
    <>
      <StatusPill label="กะ" value={now?.shift ?? "—"} tone="accent" />
      <time
        className="ml-auto rounded-[3px] border border-line-strong bg-white px-3 py-1 font-mono text-[15px] font-semibold tabular-nums text-ink"
        aria-label="เวลาปัจจุบัน (เวลาไทย)"
      >
        {now?.text ?? "--:--:--"}
      </time>
    </>
  );
}
