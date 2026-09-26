import { describe, expect, it } from "vitest";

import { allowedMntTransition, nextMntStatuses, transitionLabel } from "@/features/maintenance/rules";
import { MNT_STATUSES, mntCreateSchema, mntDoneSchema } from "@/features/maintenance/schema";

describe("allowedMntTransition — State Machine งานซ่อม (TC-MNT-03, TC-BON-07)", () => {
  // ตารางคาดหวังครบทุกคู่ 4×4 = 16 กรณี
  const allowed = new Set(["Open→In Progress", "In Progress→Waiting Part", "In Progress→Done", "Waiting Part→In Progress"]);
  for (const from of MNT_STATUSES) {
    for (const to of MNT_STATUSES) {
      const key = `${from}→${to}`;
      it(`${key} = ${allowed.has(key)}`, () => {
        expect(allowedMntTransition(from, to)).toBe(allowed.has(key));
      });
    }
  }

  it("Open → Done ตรง ๆ ไม่ได้ ต้องผ่าน In Progress ก่อน", () => {
    expect(allowedMntTransition("Open", "Done")).toBe(false);
  });

  it("Done เป็นสถานะสุดท้าย", () => {
    expect(nextMntStatuses("Done")).toEqual([]);
  });

  it("ข้อความปุ่มสื่อความหมายตามบริบท", () => {
    expect(transitionLabel("Open", "In Progress")).toBe("เริ่มซ่อม");
    expect(transitionLabel("Waiting Part", "In Progress")).toBe("อะไหล่มาแล้ว — ซ่อมต่อ");
  });
});

describe("mntCreateSchema (REQ-MNT-01, REQ-MNT-02)", () => {
  const valid = {
    machine_id: "1378a81e-54d5-4537-9963-d7332f1afbb8",
    alarm_id: "",
    technician_id: "3c4e0033-0581-495e-8c65-b88fce912df6",
    problem: "  แรงดันตก  ",
    maintained_at: "2026-09-26T13:00",
  };

  it("ไม่ผูก Alarm ได้ (งาน PM) — ค่าว่างกลายเป็น null", () => {
    const r = mntCreateSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.alarm_id).toBeNull();
      expect(r.data.problem).toBe("แรงดันตก");
    }
  });

  it("ผูก Alarm ด้วย uuid ที่ถูกรูปแบบได้ / ค่าผิดรูปแบบไม่ได้", () => {
    expect(mntCreateSchema.safeParse({ ...valid, alarm_id: "6b34c810-1feb-4176-a090-03da6513b557" }).success).toBe(true);
    expect(mntCreateSchema.safeParse({ ...valid, alarm_id: "ALM-1" }).success).toBe(false);
  });

  it("ต้องเลือกช่างผู้รับผิดชอบ", () => {
    const r = mntCreateSchema.safeParse({ ...valid, technician_id: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["technician_id"]);
  });

  it("วันเวลาในอนาคตได้ (วางแผนงาน PM ล่วงหน้า)", () => {
    expect(mntCreateSchema.safeParse({ ...valid, maintained_at: "2026-12-01T08:00" }).success).toBe(true);
  });
});

describe("mntDoneSchema — ปิดงานต้องมีการแก้ไข (TC-MNT-04)", () => {
  it("มีข้อความ → ผ่าน / ว่างหรือช่องว่างล้วน → ไม่ผ่าน", () => {
    expect(mntDoneSchema.safeParse({ action_taken: "เปลี่ยนซีล" }).success).toBe(true);
    for (const action_taken of ["", "   ", null]) {
      expect(mntDoneSchema.safeParse({ action_taken }).success).toBe(false);
    }
  });
});
