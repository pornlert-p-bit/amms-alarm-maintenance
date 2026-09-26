-- =====================================================================
-- Migration 008 — ทำให้ Audit Log เชื่อถือได้ (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ปัญหา (บทเรียนเดียวกับ migration 003 / 007 — RLS คุมแถว ไม่ได้คุมค่าในคอลัมน์):
--   policy audit_self_insert ตรวจแค่ actor_id = ผู้ส่งคำสั่ง ถ้ายิง Data API ตรง
--   ผู้ใช้ทุก Role จะใส่ log ที่ "อ้างว่าเป็น admin" (actor_role) หรือ "ย้อนเวลา" (created_at) ได้
--   ทำให้หน้า Audit Log แสดงข้อมูลที่ไม่จริง
-- ทางแก้:
--   1) trigger ก่อน INSERT เขียนทับ actor_role จาก Role จริงในตาราง profiles และ created_at = เวลาจริง
--   2) Audit Log เป็นแบบเพิ่มอย่างเดียว (append-only) — ถอนสิทธิ์ UPDATE/DELETE ระดับตารางด้วย
--      (เดิมไม่มี policy ให้แก้/ลบอยู่แล้ว ถอนซ้ำเพื่อให้สิทธิ์น้อยที่สุดตาม ADR-006)
--
-- ข้อจำกัดที่ยังเหลือ (บันทึกใน ADR-005): ผู้ใช้ยังเพิ่ม log "ในนามตัวเอง" ที่ไม่ได้เกิดจากการกระทำจริงได้
--   แต่ปลอมเป็นคนอื่น ปลอม Role หรือปลอมเวลาไม่ได้ และลบ/แก้ log ใด ๆ ไม่ได้
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ
-- =====================================================================

create or replace function public.enforce_audit_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- มี token (มาจากหน้าเว็บ) → ใช้ Role และเวลาจริงเสมอ
  -- ไม่มี token (service role / SQL Editor ของผู้ดูแล) → ใช้ค่าที่ส่งมา
  if auth.uid() is not null then
    new.actor_role := current_role_name();
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_enforce_insert on public.audit_logs;
create trigger trg_audit_enforce_insert
  before insert on public.audit_logs
  for each row execute function public.enforce_audit_insert();

revoke all on function public.enforce_audit_insert() from public, anon, authenticated;

revoke update, delete on public.audit_logs from authenticated;
