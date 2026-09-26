import { describe, expect, it } from "vitest";

import { canDeleteMachine, parsePage, sanitizeSearch } from "@/features/machine/rules";
import { machineSchema } from "@/features/machine/schema";

const valid = {
  machine_id: "M-001",
  machine_name: "CNC Lathe 01",
  machine_type: "CNC",
  location: "Line A",
  status: "Running",
};

describe("machineSchema (REQ-MCH-02…04, REQ-VAL-01…03)", () => {
  it("ข้อมูลครบและถูกต้องผ่าน", () => {
    expect(machineSchema.safeParse(valid).success).toBe(true);
  });

  it("รหัสเครื่องถูกตัดช่องว่างและแปลงเป็นตัวพิมพ์ใหญ่ (กัน m-001 กับ M-001 ซ้ำกันโดยไม่รู้ตัว)", () => {
    const r = machineSchema.safeParse({ ...valid, machine_id: "  m-001 " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.machine_id).toBe("M-001");
  });

  it("รหัสเครื่องผิดรูปแบบ → ข้อความไทยที่ช่อง machine_id (TC-VAL-02)", () => {
    for (const bad of ["M!", "M", "เครื่อง1", "M 001", "A".repeat(21)]) {
      const r = machineSchema.safeParse({ ...valid, machine_id: bad });
      expect(r.success, bad).toBe(false);
      if (!r.success) expect(r.error.issues[0].path).toEqual(["machine_id"]);
    }
  });

  it("ช่องจำเป็นว่างหรือมีแต่ช่องว่าง → ไม่ผ่าน (TC-VAL-01)", () => {
    for (const field of ["machine_name", "machine_type", "location"] as const) {
      const r = machineSchema.safeParse({ ...valid, [field]: "   " });
      expect(r.success, field).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toMatch(/^กรุณากรอก/);
    }
  });

  it("สถานะนอกรายการ → ไม่ผ่าน (REQ-MCH-04)", () => {
    const r = machineSchema.safeParse({ ...valid, status: "Broken" });
    expect(r.success).toBe(false);
  });
});

describe("canDeleteMachine — BR-05 (TC-MCH-05)", () => {
  it("ไม่มี Alarm ค้าง → ลบได้", () => {
    expect(canDeleteMachine({ openAlarms: 0 })).toEqual({ ok: true });
  });

  it("มี Alarm ค้าง → ลบไม่ได้ พร้อมเหตุผล", () => {
    const r = canDeleteMachine({ openAlarms: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("2 รายการ");
  });
});

describe("sanitizeSearch — กัน filter injection", () => {
  it("เก็บตัวอักษรไทย อังกฤษ ตัวเลข ขีด จุด", () => {
    expect(sanitizeSearch("M-001")).toBe("M-001");
    expect(sanitizeSearch("เครื่องกลึง 1.5")).toBe("เครื่องกลึง 1.5");
  });

  it("ตัดเครื่องหมายที่ใช้แทรกเงื่อนไขได้ออก", () => {
    expect(sanitizeSearch("a,machine_id.eq.x")).toBe("amachineid.eq.x"); // , และ _ ถูกตัด
    // " ) , ( ถูกตัดทิ้งหมด เหลือแค่ตัวอักษรธรรมดาที่ไม่มีผลต่อรูปแบบตัวกรอง
    expect(sanitizeSearch('M"),or(id.gt.0')).toBe("Morid.gt.0");
    expect(sanitizeSearch("100%_off")).toBe("100off");
  });

  it("ค่าที่ไม่ใช่ข้อความ / ยาวเกิน", () => {
    expect(sanitizeSearch(undefined)).toBe("");
    expect(sanitizeSearch("x".repeat(80))).toHaveLength(50);
  });
});

describe("parsePage", () => {
  it("ค่าปกติ", () => expect(parsePage("3")).toBe(3));
  it("ค่าผิดรูปแบบ → หน้า 1", () => {
    for (const bad of [undefined, "", "0", "-2", "abc", "99999999"]) expect(parsePage(bad)).toBe(1);
  });
});
