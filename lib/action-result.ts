/**
 * รูปแบบผลลัพธ์กลางของ Server Action ทุกตัว (Error Contract — docs/03-architecture.md §5.3)
 * ทำให้หน้าเว็บแสดงผลได้แบบเดียวกันทุก module: สำเร็จ / ผิดที่ช่องไหน / ไม่มีสิทธิ์ ฯลฯ
 */
export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "SERVER_ERROR";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionFailure = {
  ok: false;
  code: ActionErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  /**
   * ค่าที่ผู้ใช้กรอกมา ส่งกลับไปให้ฟอร์มแสดงซ้ำ
   * จำเป็นเพราะ React 19 ล้างค่าในฟอร์มหลังส่งทุกครั้ง — ถ้าไม่ส่งกลับ ผู้ใช้ต้องพิมพ์ใหม่หมด (NFR-USE-01)
   */
  values?: Record<string, string>;
};

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | ActionFailure;

/** state ของฟอร์ม (ใช้กับ useActionState) — null = ยังไม่ได้ส่ง */
export type FormState = ActionResult<unknown> | null;

export function fail(code: ActionErrorCode, message: string, fieldErrors?: FieldErrors): ActionFailure {
  return { ok: false, code, message, fieldErrors };
}

/** แนบค่าที่ผู้ใช้กรอกกลับไปกับผลลัพธ์ที่ล้มเหลว (เฉพาะช่องที่ระบุ และเฉพาะค่าที่เป็นข้อความ) */
export function withValues(result: ActionFailure, formData: FormData, fields: readonly string[]): ActionFailure {
  const values: Record<string, string> = {};
  for (const f of fields) {
    const v = formData.get(f);
    if (typeof v === "string") values[f] = v;
  }
  return { ...result, values };
}

/**
 * แปลง error จาก PostgreSQL (ผ่าน Supabase) เป็นข้อความภาษาไทยที่ผู้ใช้อ่านรู้เรื่อง
 * ข้อความดิบของฐานข้อมูล เช่น "duplicate key value violates unique constraint ..." ห้ามส่งถึงผู้ใช้ตรง ๆ
 *
 * รหัส error ของ PostgreSQL ที่ใช้:
 *   23505 = ค่าซ้ำ (UNIQUE)   23503 = อ้างถึงข้อมูลที่ไม่มีอยู่ (Foreign Key)
 *   23514 = ผิดกฎ CHECK       42501 = ไม่มีสิทธิ์ (RLS / GRANT)
 *
 * constraintMessages: ข้อความเฉพาะของแต่ละ constraint → { field, message }
 */
export function fromDbError(
  error: { code?: string; message?: string },
  constraintMessages: Record<string, { field?: string; message: string }> = {},
) {
  const hit = Object.entries(constraintMessages).find(([name]) => error.message?.includes(name));
  if (hit) {
    const [, { field, message }] = hit;
    const code: ActionErrorCode = error.code === "23505" ? "CONFLICT" : "VALIDATION";
    return fail(code, message, field ? { [field]: [message] } : undefined);
  }

  switch (error.code) {
    case "23505":
      return fail("CONFLICT", "ข้อมูลนี้มีอยู่แล้วในระบบ");
    case "23503":
      return fail("VALIDATION", "ข้อมูลที่อ้างถึงไม่มีอยู่ในระบบ หรือถูกลบไปแล้ว");
    case "23514":
      return fail("VALIDATION", "ข้อมูลไม่ผ่านเงื่อนไขของระบบ");
    case "42501":
      return fail("FORBIDDEN", "คุณไม่มีสิทธิ์ดำเนินการนี้");
    default:
      return fail("SERVER_ERROR", "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง");
  }
}
