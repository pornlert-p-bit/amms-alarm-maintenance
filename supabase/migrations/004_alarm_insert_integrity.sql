-- =====================================================================
-- Migration 004 — บังคับกฎของ Alarm ตอน "สร้างใหม่" ที่ชั้นฐานข้อมูล (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ปัญหาที่พบระหว่างทดสอบ (P9): migration 003 ตรวจเฉพาะ UPDATE
--   technician ยิง Data API ตรงเพื่อ INSERT Alarm ที่ "ปิดแล้ว" และปลอมผู้บันทึก/ผู้ปิดเป็นคนอื่นได้
-- ทางแก้: trigger ก่อน INSERT บังคับให้ Alarm ใหม่เริ่มที่ Open เสมอ ไม่มีข้อมูลการปิด
--         และผู้บันทึกมาจาก token ของผู้ส่งคำสั่ง
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ
-- =====================================================================

create or replace function public.enforce_alarm_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Alarm ใหม่ต้องเริ่มที่ Open และยังไม่มีข้อมูลการปิด (ปิดได้ทางเดียวคือผ่านการ UPDATE ที่ migration 003 คุมอยู่)
  new.status    := 'Open';
  new.cause     := null;
  new.closed_by := null;
  new.closed_at := null;

  -- ผู้บันทึกมาจาก token เสมอ ปลอมไม่ได้
  -- ถ้าไม่มี token (ระบบอัตโนมัติที่ใช้ service role เช่น PLC Gateway ใน v2) จึงใช้ค่าที่ส่งมา
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_alarms_enforce_insert on public.alarms;
create trigger trg_alarms_enforce_insert
  before insert on public.alarms
  for each row execute function public.enforce_alarm_insert();

revoke all on function public.enforce_alarm_insert() from public, anon, authenticated;
