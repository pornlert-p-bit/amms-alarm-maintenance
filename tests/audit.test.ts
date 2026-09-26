import { describe, expect, it } from "vitest";

import { actionLabel, auditDiff, formatAuditValue, isSensitiveAction } from "@/features/audit/format";

describe("actionLabel", () => {
  it("แปลงชื่อการกระทำที่รู้จักเป็นภาษาไทย", () => {
    expect(actionLabel("alarm.close")).toBe("ปิด Alarm");
    expect(actionLabel("user.role_change")).toBe("เปลี่ยน Role");
  });

  it("ชื่อที่ไม่รู้จักแสดงรหัสเดิม ไม่หายไป", () => {
    expect(actionLabel("machine.archive")).toBe("machine.archive");
  });

  it("การลบและเปลี่ยน Role ถือเป็นการกระทำที่ต้องเน้น", () => {
    expect(isSensitiveAction("machine.soft_delete")).toBe(true);
    expect(isSensitiveAction("alarm.create")).toBe(false);
  });
});

describe("formatAuditValue", () => {
  it.each([
    [null, "—"],
    ["", "—"],
    ["Open", "Open"],
    [42, "42"],
    [true, "true"],
    ["677f2143-0769-47a4-9f8c-ed4da20075c2", "677f2143…"],
  ])("%s → %s", (input, expected) => {
    expect(formatAuditValue(input)).toBe(expected);
  });

  it("ข้อความยาวถูกตัดที่ 60 ตัวอักษร", () => {
    expect(formatAuditValue("ก".repeat(80))).toBe(`${"ก".repeat(60)}…`);
  });
});

describe("auditDiff", () => {
  it("แสดงเฉพาะช่องที่เปลี่ยน เรียงตามชื่อ", () => {
    expect(auditDiff({ status: "Open", cause: null }, { status: "Closed", cause: "เปลี่ยนซีล" })).toEqual([
      { key: "cause", from: null, to: "เปลี่ยนซีล" },
      { key: "status", from: "Open", to: "Closed" },
    ]);
  });

  it("ค่าเท่ากันไม่แสดง", () => {
    expect(auditDiff({ status: "Open", name: "A" }, { status: "Open", name: "B" })).toEqual([
      { key: "name", from: "A", to: "B" },
    ]);
  });

  it("create (ไม่มี before) แสดงทุกช่องของ after", () => {
    expect(auditDiff(null, { machine_id: "M-001", status: "Running" })).toEqual([
      { key: "machine_id", from: null, to: "M-001" },
      { key: "status", from: null, to: "Running" },
    ]);
  });

  it("ไม่มีทั้งสองฝั่ง → ว่าง", () => {
    expect(auditDiff(null, undefined)).toEqual([]);
  });
});
