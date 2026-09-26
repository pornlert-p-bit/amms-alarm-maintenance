-- =====================================================================
-- Migration 005 — บังคับกฎของงานซ่อมบำรุงที่ชั้นฐานข้อมูล (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ใช้บทเรียนจาก Alarm (migration 003–004): RLS คุมแค่ว่า "ใครแตะแถวไหนได้"
-- ไม่ได้คุมว่า "แก้คอลัมน์ไหนเป็นค่าอะไรได้" จึงบังคับกฎด้วย trigger ตั้งแต่แรก
--
-- State Machine (docs/02-system-design.md §4):
--   Open → In Progress → Done
--              ↕
--         Waiting Part
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ
-- =====================================================================

-- ---------- ตอนสร้างใบงาน ----------
create or replace function public.enforce_maintenance_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- ใบงานใหม่เริ่มที่ Open เสมอ ยังไม่มีผลการซ่อม
  new.status       := 'Open';
  new.action_taken := null;

  -- ผู้สร้างมาจาก token ปลอมไม่ได้ (ถ้าไม่มี token = ระบบอัตโนมัติ ใช้ค่าที่ส่งมา)
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  -- Alarm ที่อ้างถึงต้องเป็นของเครื่องเดียวกับใบงาน
  if new.alarm_id is not null and not exists (
    select 1 from public.alarms a where a.id = new.alarm_id and a.machine_id = new.machine_id
  ) then
    raise exception 'alarm does not belong to this machine' using errcode = 'check_violation';
  end if;

  -- ช่างผู้รับผิดชอบต้องเป็น admin หรือ technician (ใช้ view staff_directory เพราะ RLS ไม่ให้อ่านโปรไฟล์คนอื่น)
  if new.technician_id is not null and not exists (
    select 1 from public.staff_directory s where s.id = new.technician_id and s.role in ('admin', 'technician')
  ) then
    raise exception 'technician must be admin or technician' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mnt_enforce_insert on public.maintenance_records;
create trigger trg_mnt_enforce_insert
  before insert on public.maintenance_records
  for each row execute function public.enforce_maintenance_insert();

-- ---------- ตอนแก้ไข / เปลี่ยนสถานะ ----------
create or replace function public.enforce_maintenance_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- ใบงานที่ Done แล้วเป็นประวัติ ห้ามแก้
  if old.status = 'Done' then
    raise exception 'completed maintenance cannot be modified' using errcode = 'check_violation';
  end if;

  -- ที่มาของใบงานห้ามเปลี่ยน
  if new.machine_id is distinct from old.machine_id
     or new.alarm_id is distinct from old.alarm_id
     or new.created_by is distinct from old.created_by then
    raise exception 'maintenance origin fields are immutable' using errcode = 'check_violation';
  end if;

  -- ลำดับสถานะที่อนุญาต
  if new.status is distinct from old.status then
    if not (
      (old.status = 'Open'         and new.status = 'In Progress')
      or (old.status = 'In Progress'  and new.status in ('Waiting Part', 'Done'))
      or (old.status = 'Waiting Part' and new.status = 'In Progress')
    ) then
      raise exception 'invalid maintenance status transition' using errcode = 'check_violation';
    end if;
  end if;

  -- ผลการซ่อมบันทึกได้ตอนปิดงานเท่านั้น
  if new.status <> 'Done' then
    new.action_taken := null;
  end if;

  -- เปลี่ยนช่างได้ แต่ต้องเป็น admin หรือ technician
  if new.technician_id is distinct from old.technician_id
     and new.technician_id is not null and not exists (
       select 1 from public.staff_directory s where s.id = new.technician_id and s.role in ('admin', 'technician')
     ) then
    raise exception 'technician must be admin or technician' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mnt_enforce_update on public.maintenance_records;
create trigger trg_mnt_enforce_update
  before update on public.maintenance_records
  for each row execute function public.enforce_maintenance_update();

revoke all on function public.enforce_maintenance_insert() from public, anon, authenticated;
revoke all on function public.enforce_maintenance_update() from public, anon, authenticated;

-- ไม่มีใครลบใบงานผ่าน API ได้ (ไม่มี DELETE policy อยู่แล้ว — ยืนยันซ้ำด้วยสิทธิ์ระดับตาราง)
revoke delete on public.maintenance_records from authenticated;
