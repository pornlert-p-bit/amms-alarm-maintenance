import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  isAdmin,
  isPublicPath,
  isRole,
  isStaff,
  navItemsFor,
  safeNextPath,
} from "@/lib/auth/roles";

// Test ID อ้างอิง docs/05-traceability.md

describe("Role rules (REQ-AUTH-03)", () => {
  it("รู้จักเฉพาะ 3 Role ที่กำหนด", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("technician")).toBe(true);
    expect(isRole("viewer")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("Admin และ Technician เป็น staff แต่ Viewer ไม่ใช่ (TC-BON-01)", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("technician")).toBe(true);
    expect(isStaff("viewer")).toBe(false);
  });

  it("มีแค่ Admin ที่เป็น admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("technician")).toBe(false);
    expect(isAdmin("viewer")).toBe(false);
  });
});

describe("Route access (REQ-SEC-02 / TC-SEC-02)", () => {
  it("หน้า /users เข้าได้เฉพาะ Admin รวมถึงหน้าย่อย", () => {
    expect(canAccessPath("admin", "/users")).toBe(true);
    expect(canAccessPath("technician", "/users")).toBe(false);
    expect(canAccessPath("viewer", "/users/123")).toBe(false);
  });

  it("ไม่ตีความ path ที่ชื่อขึ้นต้นเหมือนกันว่าเป็นหน้าเดียวกัน", () => {
    // /users-guide ไม่ใช่ /users — ต้องไม่ถูกล็อกโดยไม่ตั้งใจ
    expect(canAccessPath("viewer", "/users-guide")).toBe(true);
  });

  it("หน้า /simulator เข้าได้เฉพาะ Admin (ADR-004)", () => {
    expect(canAccessPath("admin", "/simulator")).toBe(true);
    expect(canAccessPath("technician", "/simulator")).toBe(false);
    expect(canAccessPath("viewer", "/simulator")).toBe(false);
  });

  it("หน้า /audit เข้าได้เฉพาะ Admin (REQ-BON-05)", () => {
    expect(canAccessPath("admin", "/audit")).toBe(true);
    expect(canAccessPath("technician", "/audit")).toBe(false);
    expect(canAccessPath("viewer", "/audit/2026")).toBe(false);
  });

  it("หน้าอื่นทุก Role ที่ Login แล้วเปิดได้", () => {
    expect(canAccessPath("viewer", "/dashboard")).toBe(true);
    expect(canAccessPath("technician", "/alarms")).toBe(true);
  });

  it("มีแค่ /login ที่เป็นหน้า public (TC-SEC-01)", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/login-admin")).toBe(false);
  });

  it("เมนู /users แสดงเฉพาะ Admin", () => {
    const hrefs = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).map((i) => i.href);
    expect(hrefs("admin")).toContain("/users");
    expect(hrefs("technician")).not.toContain("/users");
    expect(hrefs("viewer")).not.toContain("/users");
    expect(hrefs("admin")).toContain("/audit");
    expect(hrefs("technician")).not.toContain("/audit");
    expect(hrefs("admin")).toContain("/simulator");
    expect(hrefs("technician")).not.toContain("/simulator");
    expect(hrefs("viewer")).not.toContain("/simulator");
    expect(hrefs("viewer")).toContain("/dashboard");
  });
});

describe("safeNextPath — กัน Open Redirect หลัง Login", () => {
  it("ยอมรับ path ภายในเว็บ", () => {
    expect(safeNextPath("/alarms")).toBe("/alarms");
    expect(safeNextPath("/alarms?status=Open")).toBe("/alarms?status=Open");
  });

  it("ปฏิเสธลิงก์ไปเว็บอื่น แล้วใช้ /dashboard แทน", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("ค่าว่าง / ไม่ใช่ข้อความ / หน้า login → /dashboard", () => {
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath("/login")).toBe("/dashboard");
  });
});
