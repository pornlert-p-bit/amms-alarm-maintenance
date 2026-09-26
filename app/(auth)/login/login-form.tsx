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
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
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
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 ${
          hasError ? "border-red-400" : "border-slate-300"
        }`}
      />
      {hasError && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
