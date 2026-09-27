-- =====================================================================
-- Migration 009 — PLC Simulator (27 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ตาม ADR-004: v1 ยังไม่ต่อ PLC จริง ใช้หน้า /simulator ให้ Admin จำลองสัญญาณจากเครื่องแทน
-- ทางที่สัญญาณจำลองวิ่งต้องเป็น "ทางเดียวกับที่ PLC Gateway จะใช้ใน v2" คือเข้าฐานข้อมูลผ่านฟังก์ชัน
-- ไม่ใช่ให้หน้าเว็บแก้ตารางเอง
--
-- 1) trigger บันทึกประวัติสถานะ อ่าน "แหล่งที่มา" จากค่าที่ฟังก์ชันตั้งไว้ใน transaction
--    (ไม่มีค่า = manual เหมือนเดิม) → ประวัติเครื่องแยกได้ว่าสถานะมาจากคน / simulator / plc
-- 2) ฟังก์ชัน simulate_machine_status: เปลี่ยนสถานะเครื่อง แหล่งที่มา = simulator
-- 3) ฟังก์ชัน simulate_machine_fault: เครื่องเป็น Alarm + สร้าง Alarm ใหม่ ใน transaction เดียว
--    (สำเร็จทั้งคู่หรือไม่เกิดทั้งคู่) และติด event_id ขึ้นต้น 'sim-' ให้รู้ว่าเป็น Alarm จำลอง
--
-- ความปลอดภัย: ฟังก์ชันทำงานด้วยสิทธิ์ของผู้เรียก (security invoker) → RLS เดิมมีผลทั้งหมด
-- และตรวจซ้ำในฟังก์ชันว่าเป็น admin เพราะ UPDATE ที่ RLS กรองทิ้งจะไม่ error เอง
-- ผู้ใช้ปลอมแหล่งที่มาเป็น 'plc' ไม่ได้ — ฟังก์ชันตั้งค่า 'simulator' ตายตัว และ set_config ไม่ได้เปิดผ่าน API
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ
-- =====================================================================

-- ---------- 1) ประวัติสถานะรู้แหล่งที่มา ----------
create or replace function public.log_machine_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into machine_status_history (machine_id, from_status, to_status, source, changed_by)
    values (
      new.id, old.status, new.status,
      coalesce(nullif(current_setting('amms.status_source', true), ''), 'manual')::status_source,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

-- ---------- 2) จำลองสถานะเครื่อง ----------
create or replace function public.simulate_machine_status(p_machine uuid, p_status machine_status)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_role_name() is distinct from 'admin' then
    raise exception 'simulator is admin only' using errcode = '42501';
  end if;

  perform set_config('amms.status_source', 'simulator', true);  -- true = เฉพาะ transaction นี้

  update machines set status = p_status
   where id = p_machine and deleted_at is null;
  if not found then
    raise exception 'machine not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------- 3) จำลอง Fault → Alarm ----------
create or replace function public.simulate_machine_fault(p_machine uuid, p_code text, p_description text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_alarm uuid;
begin
  if current_role_name() is distinct from 'admin' then
    raise exception 'simulator is admin only' using errcode = '42501';
  end if;

  perform set_config('amms.status_source', 'simulator', true);

  update machines set status = 'Alarm'
   where id = p_machine and deleted_at is null;
  if not found then
    raise exception 'machine not found' using errcode = 'P0002';
  end if;

  -- trigger ของ migration 004 บังคับ status = Open และผู้บันทึก = auth.uid() ให้อยู่แล้ว
  insert into alarms (machine_id, alarm_code, description, occurred_at, event_id)
  values (p_machine, upper(btrim(p_code)), btrim(p_description), now(), 'sim-' || gen_random_uuid())
  returning id into v_alarm;

  return v_alarm;
end;
$$;

revoke all on function public.simulate_machine_status(uuid, machine_status) from public, anon;
revoke all on function public.simulate_machine_fault(uuid, text, text) from public, anon;
grant execute on function public.simulate_machine_status(uuid, machine_status) to authenticated;
grant execute on function public.simulate_machine_fault(uuid, text, text) to authenticated;
