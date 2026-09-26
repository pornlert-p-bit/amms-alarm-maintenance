import { describe, expect, it } from "vitest";

import { checkRoleChange } from "@/features/users/rules";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("checkRoleChange (REQ-AUTH-05, REQ-AUTH-06)", () => {
  it("admin เปลี่ยน Role ของคนอื่นได้", () => {
    expect(checkRoleChange({ actorId: ADMIN, targetId: OTHER, from: "viewer", to: "technician" })).toEqual({ ok: true });
  });

  it("ลด admin คนอื่นเป็น viewer ได้ (ยังเหลือ admin อย่างน้อย 1 คน คือคนที่กด)", () => {
    expect(checkRoleChange({ actorId: ADMIN, targetId: OTHER, from: "admin", to: "viewer" }).ok).toBe(true);
  });

  it("เปลี่ยน Role ของตัวเองไม่ได้ — ทั้งลดและเพิ่ม", () => {
    expect(checkRoleChange({ actorId: ADMIN, targetId: ADMIN, from: "admin", to: "viewer" }).ok).toBe(false);
    expect(checkRoleChange({ actorId: OTHER, targetId: OTHER, from: "viewer", to: "admin" }).ok).toBe(false);
  });

  it("เลือกค่าเดิม → ไม่ต้องบันทึก", () => {
    const r = checkRoleChange({ actorId: ADMIN, targetId: OTHER, from: "technician", to: "technician" });
    expect(r).toEqual({ ok: false, reason: "Role ที่เลือกเป็นค่าเดิมอยู่แล้ว" });
  });
});
