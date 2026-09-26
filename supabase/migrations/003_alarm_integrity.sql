-- =====================================================================
-- Migration 003 — บังคับกฎของ Alarm ที่ชั้นฐานข้อมูล (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ปัญหาที่พบระหว่างทดสอบ: RLS ให้ staff UPDATE ตาราง alarms ได้ทุกคอลัมน์
--   ถ้าข้ามหน้าเว็บไปยิง Data API ตรง จะ (1) ย้อนสถานะจาก Closed ได้ (2) ปลอมชื่อผู้ปิดได้
--   (3) แก้ผู้บันทึก/เครื่องจักรได้ — กฎเหล่านี้เคยอยู่แค่ใน Server Action ชั้นเดียว
-- ทางแก้: trigger ตรวจก่อนทุกการ UPDATE → กฎถูกบังคับไม่ว่าคำสั่งจะมาจากทางไหน (NFR-SEC-01)
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ (เกี่ยวกับสิทธิ์และความถูกต้องของข้อมูล)
-- =====================================================================

create or replace function public.enforce_alarm_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Alarm ที่ปิดแล้วเป็นประวัติ ห้ามแก้ทุกกรณี (REQ-ALM-05)
  if old.status = 'Closed' then
    raise exception 'closed alarm cannot be modified' using errcode = 'check_violation';
  end if;

  -- ข้อมูลที่ระบุตัวตน/ที่มาของ Alarm ห้ามเปลี่ยนหลังบันทึก
  if new.machine_id is distinct from old.machine_id
     or new.created_by is distinct from old.created_by
     or new.event_id is distinct from old.event_id then
    raise exception 'alarm origin fields are immutable' using errcode = 'check_violation';
  end if;

  -- ลำดับสถานะที่อนุญาต (BR-02): Open → In Progress → Closed, Open → Closed
  if new.status is distinct from old.status then
    if not (
      (old.status = 'Open' and new.status in ('In Progress', 'Closed'))
      or (old.status = 'In Progress' and new.status = 'Closed')
    ) then
      raise exception 'invalid alarm status transition' using errcode = 'check_violation';
    end if;
  end if;

  -- ผู้ปิดและเวลาปิดมาจาก token ของผู้ส่งคำสั่งเสมอ — ค่าที่ส่งมาจะถูกเขียนทับ ปลอมไม่ได้ (REQ-ALM-04)
  if new.status = 'Closed' then
    new.closed_by := auth.uid();
    new.closed_at := now();
  else
    new.closed_by := null;
    new.closed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_alarms_enforce_update on public.alarms;
create trigger trg_alarms_enforce_update
  before update on public.alarms
  for each row execute function public.enforce_alarm_update();

-- ห้ามผู้ใช้ทั่วไปเรียกฟังก์ชันนี้ตรง ๆ (ทำงานผ่าน trigger เท่านั้น)
revoke all on function public.enforce_alarm_update() from public, anon, authenticated;
