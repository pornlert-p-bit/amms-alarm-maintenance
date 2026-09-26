"use client";

import { useActionState } from "react";

import { buttonClass, inputClass } from "@/components/station/ui";
import type { FormState } from "@/lib/action-result";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/auth/roles";

import { changeUserRole } from "../actions";

/**
 * ช่องเปลี่ยน Role ของผู้ใช้หนึ่งคน (หนึ่งแถวในตาราง)
 * ถามยืนยันก่อนส่ง เพราะการเปลี่ยน Role มีผลกับสิทธิ์ของคนนั้นทันที
 */
export function RoleForm({ userId, userName, current }: { userId: string; userName: string; current: Role }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeUserRole.bind(null, userId), null);

  function confirmChange(e: React.FormEvent<HTMLFormElement>) {
    const to = new FormData(e.currentTarget).get("role") as Role;
    if (to === current) return; // ปล่อยให้ server ตอบว่า "ค่าเดิม"
    const ok = window.confirm(`เปลี่ยน Role ของ ${userName}\nจาก ${ROLE_LABEL[current]} เป็น ${ROLE_LABEL[to]} ?\n\nมีผลกับสิทธิ์ของผู้ใช้ทันที`);
    if (!ok) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={confirmChange} className="flex flex-wrap items-center gap-2">
      <label htmlFor={`role-${userId}`} className="sr-only">Role ใหม่ของ {userName}</label>
      {/* key = Role ปัจจุบัน: หลังบันทึกสำเร็จ ตัวเลือกจะรีเซ็ตเป็นค่าใหม่จาก server */}
      <select key={current} id={`role-${userId}`} name="role" defaultValue={current} disabled={pending}
        className={inputClass(false, "w-auto py-1.5 text-[13px]")}>
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={buttonClass.small}>
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
      {state && (
        <span role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-ok" : "text-bad-ink"}`}>
          {state.ok ? `✓ ${state.message ?? "บันทึกแล้ว"}` : state.message}
        </span>
      )}
    </form>
  );
}
