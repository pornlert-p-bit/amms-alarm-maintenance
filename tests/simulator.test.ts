import { describe, expect, it } from "vitest";

import { faultsFor, isSimStatus, isSimulatedAlarm, pickFault } from "@/features/simulator/faults";

describe("faultsFor — Fault ตามประเภทเครื่อง", () => {
  it("เครื่อง CNC ได้ Fault ของ CNC ก่อน แล้วต่อด้วย Fault ทั่วไป", () => {
    expect(faultsFor("CNC").map((f) => f.code)).toEqual(["E-101", "E-105", "PLC-900", "PLC-901"]);
  });

  it("จับคำในชื่อประเภทแบบไม่สนตัวพิมพ์", () => {
    expect(faultsFor("Injection Molding")[0].code).toBe("E-042");
    expect(faultsFor("packing")[0].code).toBe("P-601");
  });

  it("ประเภทที่ไม่รู้จัก ได้แค่ Fault ทั่วไป", () => {
    expect(faultsFor("Test").map((f) => f.code)).toEqual(["PLC-900", "PLC-901"]);
  });

  it("รหัสทุกตัวตรงรูปแบบรหัส Alarm (ตัวใหญ่ ตัวเลข ขีด)", () => {
    for (const type of ["CNC", "Injection", "Conveyor", "Robot", "Hydraulic", "Packing", "x"]) {
      for (const f of faultsFor(type)) expect(f.code).toMatch(/^[A-Z0-9-]{1,30}$/);
    }
  });
});

describe("pickFault — เลือกจากลำดับที่หน้าเว็บส่งมาเท่านั้น", () => {
  it("ลำดับถูกต้องได้ Fault", () => {
    expect(pickFault("Conveyor", "1")?.code).toBe("C-305");
  });

  it.each([["9"], ["-1"], ["1.5"], ["abc"], [""], [undefined], [2]])("ค่า %s → null", (index) => {
    expect(pickFault("Conveyor", index)).toBeNull();
  });
});

describe("สถานะที่จำลองได้", () => {
  it("กด RUN / STOP / MAINT ได้ แต่ Alarm ต้องมาจาก Fault เท่านั้น", () => {
    expect(isSimStatus("Running")).toBe(true);
    expect(isSimStatus("Maintenance")).toBe(true);
    expect(isSimStatus("Alarm")).toBe(false);
    expect(isSimStatus("running")).toBe(false);
  });

  it("isSimulatedAlarm ดูจาก event_id ขึ้นต้น sim-", () => {
    expect(isSimulatedAlarm("sim-1234")).toBe(true);
    expect(isSimulatedAlarm("demo-seed-001")).toBe(false);
    expect(isSimulatedAlarm(null)).toBe(false);
  });
});
