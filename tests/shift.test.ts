import { describe, expect, it } from "vitest";

import { shiftOfHour } from "@/lib/shift";

describe("shiftOfHour — กะการทำงาน", () => {
  it("08:00–15:59 = กะเช้า", () => {
    expect(shiftOfHour(8)).toBe("เช้า");
    expect(shiftOfHour(15)).toBe("เช้า");
  });

  it("16:00–23:59 = กะบ่าย", () => {
    expect(shiftOfHour(16)).toBe("บ่าย");
    expect(shiftOfHour(23)).toBe("บ่าย");
  });

  it("00:00–07:59 = กะดึก", () => {
    expect(shiftOfHour(0)).toBe("ดึก");
    expect(shiftOfHour(7)).toBe("ดึก");
  });

  it("ค่าที่ไม่ใช่ชั่วโมงจริง → error ชัดเจน", () => {
    expect(() => shiftOfHour(24)).toThrow(RangeError);
    expect(() => shiftOfHour(-1)).toThrow(RangeError);
    expect(() => shiftOfHour(7.5)).toThrow(RangeError);
  });
});
