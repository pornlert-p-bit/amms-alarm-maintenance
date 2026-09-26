"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "@/lib/auth/actions";

/**
 * ฟอร์ม Login (Client Component เพราะต้องมี state: ข้อความ error และสถานะกำลังส่ง)
 * การตรวจสิทธิ์จริงทำใน signIn() ฝั่ง server — ฟอร์มนี้มีหน้าที่แค่รับค่าและแสดงผล
 */
export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div
          role="alert"
          className="rounded-[3px] border border-bad bg-bad-bg px-3 py-2 text-[13px] text-bad-ink"
        >
          {state.error}
        </div>
      )}

      <Field
        label="อีเมล"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        label="รหัสผ่าน"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />

      {/* ปิดปุ่มระหว่างส่ง กันกดซ้ำ (Failure Mode FM-02) */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[3px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
};

function Field({ label, name, type, autoComplete, defaultValue, errors }: FieldProps) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div>
      <label htmlFor={name} className="mb-1 flex items-center gap-2 text-[13.5px] text-ink-2">
        {/* จุดหน้าป้ายชื่อช่อง แบบแถวตั้งค่าของ One Card — สีแดงเมื่อช่องนั้นมีปัญหา */}
        <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${hasError ? "bg-bad" : "bg-accent"}`} />
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full rounded-[3px] border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          hasError ? "border-bad" : "border-line-strong"
        }`}
      />
      {hasError && (
        <p id={errorId} className="mt-1 text-xs text-bad-ink">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
