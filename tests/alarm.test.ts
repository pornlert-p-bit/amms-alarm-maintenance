import { describe, expect, it } from "vitest";

import { allowedAlarmTransition, nextAlarmStatuses } from "@/features/alarm/rules";
import { ALARM_STATUSES, alarmCloseSchema, alarmCreateSchema, isNotFuture } from "@/features/alarm/schema";

describe("allowedAlarmTransition — BR-02 (TC-ALM-02, TC-ALM-05)", () => {
  // ตารางคาดหวังครบทุกคู่ 3×3 = 9 กรณี
  const expected: Record<string, boolean> = {
    "Open→Open": false,
    "Open→In Progress": true,
    "Open→Closed": true,
    "In Progress→Open": false,
    "In Progress→In Progress": false,
    "In Progress→Closed": true,
    "Closed→Open": false,
    "Closed→In Progress": false,
    "Closed→Closed": false,
  };
  for (const from of ALARM_STATUSES) {
    for (const to of ALARM_STATUSES) {
      it(`${from} → ${to} = ${expected[`${from}→${to}`]}`, () => {
        expect(allowedAlarmTransition(from, to)).toBe(expected[`${from}→${to}`]);
      });
    }
  }

  it("Closed ไม่มีสถานะถัดไป (สถานะสุดท้าย)", () => {
    expect(nextAlarmStatuses("Closed")).toEqual([]);
  });
});

describe("alarmCreateSchema (REQ-ALM-01, REQ-VAL-04)", () => {
  const valid = {
    machine_id: "3c4e0033-0581-495e-8c65-b88fce912df6",
    alarm_code: " alm-103 ",
    description: "Motor overload",
    occurred_at: "2026-09-26T09:00",
  };

  it("ข้อมูลถูกต้อง: รหัสเป็นตัวใหญ่ และเวลาแปลงเป็น UTC ถูกต้อง", () => {
    const r = alarmCreateSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.alarm_code).toBe("ALM-103");
      expect(r.data.occurred_at).toBe("2026-09-26T02:00:00.000Z");
    }
  });

  it("ไม่ได้เลือกเครื่อง / ค่าไม่ใช่ uuid → ไม่ผ่าน", () => {
    for (const machine_id of ["", "M-001"]) {
      const r = alarmCreateSchema.safeParse({ ...valid, machine_id });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].path).toEqual(["machine_id"]);
    }
  });

  it("เวลาในอนาคต → ไม่ผ่าน (TC-VAL-04)", () => {
    const r = alarmCreateSchema.safeParse({ ...valid, occurred_at: "2099-01-01T00:00" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("อนาคต");
  });

  it("เวลารูปแบบผิด → ไม่ผ่าน", () => {
    const r = alarmCreateSchema.safeParse({ ...valid, occurred_at: "26/09/2026" });
    expect(r.success).toBe(false);
  });

  it("isNotFuture เผื่อนาฬิกาคลาด 1 นาที", () => {
    const now = new Date("2026-09-26T03:00:00Z");
    expect(isNotFuture("2026-09-26T03:00:59Z", now)).toBe(true);
    expect(isNotFuture("2026-09-26T03:01:01Z", now)).toBe(false);
  });
});

describe("alarmCloseSchema — ปิด Alarm ต้องมีสาเหตุ (TC-ALM-03)", () => {
  it("มีสาเหตุ → ผ่าน", () => {
    expect(alarmCloseSchema.safeParse({ cause: "Sensor เสีย เปลี่ยนใหม่แล้ว" }).success).toBe(true);
  });
  it("ว่าง / ช่องว่างล้วน / ไม่ส่งมา → ไม่ผ่าน", () => {
    for (const cause of ["", "   ", null]) {
      expect(alarmCloseSchema.safeParse({ cause }).success).toBe(false);
    }
  });
});
