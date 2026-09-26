import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/auth/schema";
import { maskEmail } from "@/lib/mask";

describe("loginSchema (REQ-VAL-01, REQ-VAL-03)", () => {
  it("ผ่านเมื่อข้อมูลครบและถูกรูปแบบ พร้อมตัดช่องว่างหัวท้ายอีเมล", () => {
    const r = loginSchema.safeParse({ email: "  tech@example.com ", password: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("tech@example.com");
  });

  it("อีเมลว่างหรือเป็นช่องว่างล้วน → ข้อความภาษาไทยที่ช่อง email", () => {
    const r = loginSchema.safeParse({ email: "   ", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["email"]);
      expect(r.error.issues[0].message).toBe("กรุณากรอกอีเมล");
    }
  });

  it("อีเมลผิดรูปแบบ → แจ้งรูปแบบไม่ถูกต้อง", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("รูปแบบอีเมลไม่ถูกต้อง");
  });

  it("รหัสผ่านว่าง / ไม่ได้ส่งมา → แจ้งที่ช่อง password", () => {
    for (const password of ["", null]) {
      const r = loginSchema.safeParse({ email: "a@b.co", password });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].path).toEqual(["password"]);
    }
  });
});

describe("maskEmail — ปิดบังอีเมลก่อนเขียน log", () => {
  it("เหลือ 2 ตัวแรกของชื่อ และโดเมนเต็ม", () => {
    expect(maskEmail("somchai@factory.com")).toBe("so***@factory.com");
  });

  it("ชื่อสั้นมากก็ไม่เผยทั้งชื่อ", () => {
    expect(maskEmail("ab@x.co")).toBe("a***@x.co");
    expect(maskEmail("a@x.co")).toBe("***@x.co");
  });

  it("ค่าที่ไม่ใช่อีเมล → *** อย่างเดียว", () => {
    expect(maskEmail("no-at-sign")).toBe("***");
    expect(maskEmail("@x.co")).toBe("***");
  });
});
