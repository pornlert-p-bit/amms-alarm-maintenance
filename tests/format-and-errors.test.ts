import { describe, expect, it } from "vitest";

import { fromDbError } from "@/lib/action-result";
import {
  bangkokDayRange,
  formatDateTime,
  parseBangkokLocal,
  toBangkokLocalInput,
} from "@/lib/format";

describe("เวลาไทย (lib/format.ts)", () => {
  it("ค่าจาก datetime-local ถูกตีความเป็นเวลาไทย (UTC+7)", () => {
    expect(parseBangkokLocal("2026-09-26T10:30")).toBe("2026-09-26T03:30:00.000Z");
  });

  it("รูปแบบผิด → null", () => {
    for (const bad of ["", "26/09/2026 10:30", "2026-09-26", "2026-13-40T99:99"]) {
      expect(parseBangkokLocal(bad), bad).toBeNull();
    }
  });

  it("แปลงกลับไปใส่ช่อง datetime-local ได้ตรงค่าเดิม", () => {
    expect(toBangkokLocalInput("2026-09-26T03:30:00.000Z")).toBe("2026-09-26T10:30");
    expect(toBangkokLocalInput("2026-09-26T17:05:00.000Z")).toBe("2026-09-27T00:05");
  });

  it("แสดงผลเป็นปี พ.ศ. และเวลาไทย", () => {
    const text = formatDateTime("2026-09-26T03:30:00.000Z");
    expect(text).toContain("2569");
    expect(text).toContain("10:30");
    expect(formatDateTime(null)).toBe("—");
  });

  it("ช่วงวันที่ของ filter ใช้ขอบเขตเที่ยงคืนเวลาไทย", () => {
    expect(bangkokDayRange("2026-09-26")).toEqual({
      start: "2026-09-25T17:00:00.000Z",
      end: "2026-09-26T17:00:00.000Z",
    });
    expect(bangkokDayRange("26-09-2026")).toBeNull();
  });
});

describe("fromDbError — แปลง error ฐานข้อมูลเป็นข้อความไทย", () => {
  const map = {
    machines_machine_id_key: { field: "machine_id", message: "รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ" },
  };

  it("ชน UNIQUE ที่รู้จัก → CONFLICT พร้อมระบุช่อง (TC-MCH-03)", () => {
    const r = fromDbError(
      { code: "23505", message: 'duplicate key value violates unique constraint "machines_machine_id_key"' },
      map,
    );
    expect(r).toEqual({
      ok: false,
      code: "CONFLICT",
      message: "รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ",
      fieldErrors: { machine_id: ["รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ"] },
    });
  });

  it("ไม่มีสิทธิ์ (RLS) → FORBIDDEN", () => {
    expect(fromDbError({ code: "42501", message: "new row violates row-level security policy" }).code).toBe("FORBIDDEN");
  });

  it("error ที่ไม่รู้จัก → SERVER_ERROR และไม่ส่งข้อความดิบของฐานข้อมูลถึงผู้ใช้", () => {
    const r = fromDbError({ code: "XX000", message: "internal: relation secret_table ..." });
    expect(r.code).toBe("SERVER_ERROR");
    expect(r.message).not.toContain("secret_table");
  });
});
