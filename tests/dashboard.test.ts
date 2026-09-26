import { describe, expect, it } from "vitest";

import {
  addDays,
  countByStatus,
  dailySeries,
  formatDuration,
  groupByLocation,
  mttr,
  pareto,
  parseRange,
  rangeStart,
} from "@/features/dashboard/metrics";

describe("ช่วงวันที่ (REQ-DSH-04)", () => {
  it("parseRange รับแค่ 7 หรือ 30 — ค่าอื่นเป็น 7", () => {
    expect(parseRange("30")).toBe(30);
    expect(parseRange("7")).toBe(7);
    expect(parseRange(undefined)).toBe(7);
    expect(parseRange("999")).toBe(7);
  });

  it("addDays ข้ามเดือน/ปีได้ถูกต้อง", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("7 วันล่าสุดที่จบวันที่ 26 เริ่มวันที่ 20", () => {
    expect(rangeStart("2026-09-26", 7)).toBe("2026-09-20");
  });

  it("dailySeries เติม 0 ในวันที่ไม่มี Alarm และรวมหลายรหัสในวันเดียวกัน", () => {
    const s = dailySeries(
      [
        { day: "2026-09-26", alarm_code: "E-101", total: 2 },
        { day: "2026-09-26", alarm_code: "C-301", total: 1 },
        { day: "2026-09-24", alarm_code: "E-101", total: 4 },
        { day: "2026-09-10", alarm_code: "E-101", total: 9 }, // นอกช่วง 7 วัน
      ],
      "2026-09-26",
      7,
    );
    expect(s).toHaveLength(7);
    expect(s[0]).toEqual({ day: "2026-09-20", label: "20/9", total: 0 });
    expect(s.find((d) => d.day === "2026-09-24")?.total).toBe(4);
    expect(s[6]).toEqual({ day: "2026-09-26", label: "26/9", total: 3 });
    expect(s.reduce((a, d) => a + d.total, 0)).toBe(7);
  });
});

describe("pareto — รหัส Alarm ที่เกิดบ่อย (REQ-BON-02)", () => {
  const rows = [
    { day: "2026-09-25", alarm_code: "A", total: 5 },
    { day: "2026-09-26", alarm_code: "A", total: 1 },
    { day: "2026-09-26", alarm_code: "B", total: 3 },
    { day: "2026-09-26", alarm_code: "C", total: 1 },
    { day: "2026-09-01", alarm_code: "Z", total: 50 }, // นอกช่วง
  ];

  it("เรียงมากไปน้อย รวมหลายวัน และตัดข้อมูลนอกช่วง", () => {
    const p = pareto(rows, "2026-09-20");
    expect(p.items.map((i) => [i.code, i.total])).toEqual([["A", 6], ["B", 3], ["C", 1]]);
    expect(p.grandTotal).toBe(10);
  });

  it("% สะสมคิดจากยอดรวมทุกรหัส จบที่ 100", () => {
    expect(pareto(rows, "2026-09-20").items.map((i) => i.cumPct)).toEqual([60, 90, 100]);
  });

  it("แสดงแค่ limit รหัส แต่ % สะสมยังเทียบกับยอดรวมทั้งหมด", () => {
    const p = pareto(rows, "2026-09-20", 1);
    expect(p.items).toEqual([{ code: "A", total: 6, cumPct: 60 }]);
    expect(p.codeCount).toBe(3);
  });

  it("ไม่มีข้อมูล → รายการว่าง ไม่หารด้วยศูนย์", () => {
    expect(pareto([], "2026-09-20")).toEqual({ items: [], grandTotal: 0, codeCount: 0 });
  });
});

describe("mttr — เวลาซ่อมเฉลี่ย", () => {
  it("หารเวลาซ่อมรวมด้วยจำนวนที่ปิด และรับ numeric ที่มาเป็นสตริง", () => {
    const r = mttr(
      [
        { day: "2026-09-26", closed: 2, repair_minutes: 90 },
        { day: "2026-09-25", closed: 1, repair_minutes: "30" },
        { day: "2026-09-01", closed: 5, repair_minutes: 9999 }, // นอกช่วง
      ],
      "2026-09-20",
    );
    expect(r).toEqual({ closed: 3, minutes: 40 });
  });

  it("ยังไม่มีการปิด → minutes = null (แสดง —)", () => {
    expect(mttr([], "2026-09-20")).toEqual({ closed: 0, minutes: null });
  });
});

describe("formatDuration", () => {
  it.each([
    [null, "—"],
    [0, "0 นาที"],
    [45.4, "45 นาที"],
    [60, "1 ชม."],
    [125, "2 ชม. 5 นาที"],
    [24 * 60, "1 วัน"],
    [27 * 60 + 10, "1 วัน 3 ชม."],
  ])("%s นาที → %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe("สรุปเครื่องจักร (REQ-DSH-01, REQ-DSH-02)", () => {
  it("countByStatus มีครบ 4 สถานะแม้บางสถานะเป็น 0", () => {
    expect(countByStatus([{ status: "Running" }, { status: "Running" }, { status: "Alarm" }])).toEqual({
      Running: 2,
      Stop: 0,
      Alarm: 1,
      Maintenance: 0,
    });
  });

  it("groupByLocation จัดกลุ่มตามไลน์ ตัดช่องว่างหัวท้าย และเรียงรหัสเครื่อง", () => {
    const g = groupByLocation([
      { location: "Line B", machine_id: "M-003" },
      { location: "Line A ", machine_id: "M-002" },
      { location: "Line A", machine_id: "M-001" },
    ]);
    expect(g.map((x) => [x.location, x.machines.map((m) => m.machine_id)])).toEqual([
      ["Line A", ["M-001", "M-002"]],
      ["Line B", ["M-003"]],
    ]);
  });
});
