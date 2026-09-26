-- ตรวจด้วย PostgreSQL grammar (libpg_query) แล้ว: 72 statements, parse ผ่านทั้งหมด
-- เอกสารอธิบายการออกแบบ: docs/04-database-schema.md

-- =====================================================================
-- AMMS — Alarm & Maintenance Management System
-- Supabase / PostgreSQL Schema  (v1.0)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role      as enum ('admin', 'technician', 'viewer');
create type machine_status as enum ('Running', 'Stop', 'Alarm', 'Maintenance');
create type alarm_status   as enum ('Open', 'In Progress', 'Closed');
create type mnt_status     as enum ('Open', 'In Progress', 'Waiting Part', 'Done');
create type status_source  as enum ('manual', 'simulator', 'plc');

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------

-- PROFILES : ผูก 1:1 กับ auth.users เก็บ role
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text        not null check (btrim(full_name) <> ''),
  role       user_role   not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MACHINES : Machine Master + สถานะปัจจุบัน + soft delete
create table machines (
  id              uuid primary key default gen_random_uuid(),
  machine_id      text           not null unique,
  machine_name    text           not null check (btrim(machine_name) <> ''),
  machine_type    text           not null check (btrim(machine_type) <> ''),
  location        text           not null check (btrim(location)     <> ''),
  status          machine_status  not null default 'Running',
  last_seen_at    timestamptz,                    -- ล่าสุดที่ได้ข้อมูลจาก PLC (v2)
  deleted_at      timestamptz,                    -- soft delete
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now(),
  constraint machines_machine_id_format
    check (machine_id ~ '^[A-Za-z0-9-]{2,20}$')
);

-- ALARMS : Alarm Record
create table alarms (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid          not null references machines(id) on delete restrict,
  alarm_code  text          not null check (btrim(alarm_code)  <> ''),
  description text          not null check (btrim(description) <> ''),
  cause       text,
  occurred_at timestamptz   not null default now(),
  status      alarm_status  not null default 'Open',
  created_by  uuid references profiles(id) on delete set null,
  closed_by   uuid references profiles(id) on delete set null,
  closed_at   timestamptz,
  event_id    text unique,                        -- idempotency key จาก gateway (v2)
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  -- BR-03 : ปิด Alarm ต้องมี cause + ผู้ปิด + เวลาปิด
  constraint alarms_closed_requires_cause
    check (
      status <> 'Closed'
      or (btrim(coalesce(cause, '')) <> '' and closed_at is not null and closed_by is not null)
    ),
  -- ถ้ายังไม่ปิด ต้องไม่มีข้อมูลการปิดหลงเหลือ
  constraint alarms_open_has_no_close_data
    check (status = 'Closed' or (closed_at is null and closed_by is null))
);

-- MAINTENANCE RECORDS : งานซ่อมบำรุง
create table maintenance_records (
  id            uuid primary key default gen_random_uuid(),
  machine_id    uuid        not null references machines(id) on delete restrict,
  alarm_id      uuid        references alarms(id)   on delete set null,
  technician_id uuid        references profiles(id) on delete set null,
  problem       text        not null check (btrim(problem) <> ''),
  action_taken  text,
  maintained_at timestamptz not null default now(),
  status        mnt_status  not null default 'Open',
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- BR-04 : ปิดงานต้องมี action_taken
  constraint mnt_done_requires_action
    check (status <> 'Done' or btrim(coalesce(action_taken, '')) <> '')
);

-- MACHINE STATUS HISTORY : append-only รองรับหน้า Machine History
create table machine_status_history (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid           not null references machines(id) on delete cascade,
  from_status machine_status,
  to_status   machine_status not null,
  source      status_source  not null default 'manual',
  changed_by  uuid references profiles(id) on delete set null,
  changed_at  timestamptz    not null default now()
);

-- AUDIT LOGS : append-only
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  actor_role  user_role,
  action      text not null,          -- เช่น 'alarm.close', 'machine.update', 'user.role_change'
  entity_type text not null,          -- 'machine' | 'alarm' | 'maintenance' | 'profile'
  entity_id   uuid,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------
create index idx_machines_status       on machines(status) where deleted_at is null;
create index idx_machines_active       on machines(deleted_at);
create index idx_machines_search       on machines(machine_id, machine_name);

create index idx_alarms_machine        on alarms(machine_id);
create index idx_alarms_status         on alarms(status);
create index idx_alarms_occurred       on alarms(occurred_at desc);
create index idx_alarms_code           on alarms(alarm_code);
create index idx_alarms_open           on alarms(machine_id) where status <> 'Closed';

create index idx_mnt_machine           on maintenance_records(machine_id);
create index idx_mnt_status            on maintenance_records(status);
create index idx_mnt_technician        on maintenance_records(technician_id);
create index idx_mnt_date              on maintenance_records(maintained_at desc);

create index idx_history_machine       on machine_status_history(machine_id, changed_at desc);
create index idx_audit_entity          on audit_logs(entity_type, entity_id);
create index idx_audit_created         on audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- 4. TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------

-- 4.1 updated_at อัตโนมัติ
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated  before update on profiles
  for each row execute function set_updated_at();
create trigger trg_machines_updated  before update on machines
  for each row execute function set_updated_at();
create trigger trg_alarms_updated    before update on alarms
  for each row execute function set_updated_at();
create trigger trg_mnt_updated       before update on maintenance_records
  for each row execute function set_updated_at();

-- 4.2 BR-08 : occurred_at ต้องไม่เป็นอนาคต
--     ใช้ trigger เพราะ CHECK constraint ห้ามใช้ฟังก์ชันที่ไม่ IMMUTABLE เช่น now()
create or replace function check_occurred_at_not_future()
returns trigger language plpgsql as $$
begin
  if new.occurred_at > now() + interval '1 minute' then   -- เผื่อ clock skew 1 นาที
    raise exception 'occurred_at must not be in the future'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_alarms_check_occurred_at
  before insert or update of occurred_at on alarms
  for each row execute function check_occurred_at_not_future();

-- 4.3 บันทึกประวัติเมื่อสถานะเครื่องเปลี่ยน
create or replace function log_machine_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into machine_status_history (machine_id, from_status, to_status, source, changed_by)
    values (new.id, old.status, new.status, 'manual', auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_machines_status_history
  after update of status on machines
  for each row execute function log_machine_status_change();

-- 4.4 สร้าง profile อัตโนมัติเมื่อมี user ใหม่ (role ต่ำสุด)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    'viewer'                      -- REQ-AUTH-04 : สิทธิ์ต่ำสุดเป็นค่าตั้งต้น
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 5. RLS HELPER
-- ---------------------------------------------------------------------
-- security definer เพื่ออ่าน profiles ได้แม้ policy จะจำกัด
-- set search_path ป้องกัน search_path hijacking
create or replace function current_role_name()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

revoke all on function current_role_name() from public, anon;
grant execute on function current_role_name() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table profiles              enable row level security;
alter table machines              enable row level security;
alter table alarms                enable row level security;
alter table maintenance_records   enable row level security;
alter table machine_status_history enable row level security;
alter table audit_logs            enable row level security;

-- ---------- PROFILES ----------
create policy profiles_select_self_or_admin on profiles
  for select to authenticated
  using (id = auth.uid() or current_role_name() = 'admin');

-- BR-07 : admin แก้ role ของคนอื่นได้ แต่ของตัวเองไม่ได้ — บังคับที่ชั้น DB
create policy profiles_admin_update_others on profiles
  for update to authenticated
  using      (current_role_name() = 'admin' and id <> auth.uid())
  with check (current_role_name() = 'admin' and id <> auth.uid());

-- ---------- MACHINES ----------
create policy machines_select_authenticated on machines
  for select to authenticated
  using (true);

create policy machines_admin_insert on machines
  for insert to authenticated
  with check (current_role_name() = 'admin');

create policy machines_admin_update on machines
  for update to authenticated
  using      (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
-- ไม่มี DELETE policy → ลบจริงไม่ได้ ใช้ soft delete ผ่าน UPDATE เท่านั้น

-- ---------- ALARMS ----------
create policy alarms_select_authenticated on alarms
  for select to authenticated
  using (true);

create policy alarms_staff_insert on alarms
  for insert to authenticated
  with check (current_role_name() in ('admin', 'technician'));

create policy alarms_staff_update on alarms
  for update to authenticated
  using      (current_role_name() in ('admin', 'technician'))
  with check (current_role_name() in ('admin', 'technician'));

-- ---------- MAINTENANCE RECORDS ----------
create policy mnt_select_authenticated on maintenance_records
  for select to authenticated
  using (true);

create policy mnt_staff_insert on maintenance_records
  for insert to authenticated
  with check (current_role_name() in ('admin', 'technician'));

create policy mnt_staff_update on maintenance_records
  for update to authenticated
  using      (current_role_name() in ('admin', 'technician'))
  with check (current_role_name() in ('admin', 'technician'));

-- ---------- MACHINE STATUS HISTORY (append-only) ----------
create policy history_select_authenticated on machine_status_history
  for select to authenticated
  using (true);

create policy history_admin_insert on machine_status_history
  for insert to authenticated
  with check (current_role_name() = 'admin');

-- ---------- AUDIT LOGS (append-only, อ่านได้เฉพาะ admin) ----------
create policy audit_admin_select on audit_logs
  for select to authenticated
  using (current_role_name() = 'admin');

create policy audit_self_insert on audit_logs
  for insert to authenticated
  with check (actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. GRANTS — Least Privilege  (REQ-SEC-05)
-- ---------------------------------------------------------------------
-- ถอนสิทธิ์ของ anon ออกจากตารางข้อมูลทั้งหมด
-- เพื่อไม่ให้ตารางที่เพิ่มในอนาคตแล้วลืมเปิด RLS รั่วสู่ผู้ที่ยังไม่ Login
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke usage on schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- ให้สิทธิ์เฉพาะผู้ที่ Login แล้ว โดยยังผ่าน RLS เป็นชั้นบังคับ
grant usage on schema public to authenticated, service_role;
grant select, insert, update on
  profiles, machines, alarms, maintenance_records,
  machine_status_history, audit_logs
  to authenticated;
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------
-- 8. SEED (ตัวอย่าง — รันหลังสร้าง user ใน Authentication แล้ว)
-- ---------------------------------------------------------------------
-- 1) สร้าง user ใน Supabase Dashboard > Authentication > Users
-- 2) trigger จะสร้าง profile ให้อัตโนมัติด้วย role = 'viewer'
-- 3) ยกระดับ role ของบัญชีผู้ดูแลชุดแรกด้วยคำสั่งนี้ (ครั้งเดียว)
--
-- update profiles set role = 'admin'
--  where id = (select id from auth.users where email = 'admin@example.com');
--
-- insert into machines (machine_id, machine_name, machine_type, location) values
--   ('M-001', 'CNC Lathe 01',    'CNC',        'Line A'),
--   ('M-002', 'Injection 02',    'Molding',    'Line B'),
--   ('M-003', 'Conveyor 03',     'Conveyor',   'Line A'),
--   ('M-004', 'Robot Arm 04',    'Robot',      'Line C');

-- ---------------------------------------------------------------------
-- 9. STAFF DIRECTORY (เพิ่มใน migration 002 — ดู supabase/migrations/002_staff_directory.sql)
-- ---------------------------------------------------------------------
-- ⚠️ view นี้ข้าม RLS ของ profiles โดยตั้งใจ — เลือกได้แค่ id, full_name, role เท่านั้น
create or replace view public.staff_directory
with (security_invoker = false) as
  select id, full_name, role
  from public.profiles;

revoke all on public.staff_directory from public, anon;
grant select on public.staff_directory to authenticated;

-- ---------------------------------------------------------------------
-- 10. ALARM INTEGRITY (เพิ่มใน migration 003 — ดู supabase/migrations/003_alarm_integrity.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 11. ALARM INSERT INTEGRITY (เพิ่มใน migration 004 — ดู supabase/migrations/004_alarm_insert_integrity.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 12. MAINTENANCE INTEGRITY (เพิ่มใน migration 005 — ดู supabase/migrations/005_maintenance_integrity.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 13. DASHBOARD VIEWS (เพิ่มใน migration 006 — ดู supabase/migrations/006_dashboard_views.sql)
-- ---------------------------------------------------------------------

-- จำนวน Alarm ต่อวัน ต่อรหัส → ใช้ทั้งกราฟรายวัน (รวมตามวัน) และ Pareto (รวมตามรหัส)
create or replace view public.dashboard_alarm_code_daily
with (security_invoker = true) as
  select
    (occurred_at at time zone 'Asia/Bangkok')::date as day,
    alarm_code,
    count(*)::int as total
  from public.alarms
  where occurred_at >= now() - interval '31 days'
  group by 1, 2;

-- Alarm ที่ปิดแล้ว ต่อวันที่ปิด: จำนวน + เวลาซ่อมรวม (นาที) → หน้าเว็บหาร = MTTR
create or replace view public.dashboard_alarm_repair_daily
with (security_invoker = true) as
  select
    (closed_at at time zone 'Asia/Bangkok')::date as day,
    count(*)::int as closed,
    round(sum(extract(epoch from (closed_at - occurred_at)) / 60.0)::numeric, 1) as repair_minutes
  from public.alarms
  where status = 'Closed'
    and closed_at is not null
    and closed_at >= now() - interval '31 days'
  group by 1;

revoke all on public.dashboard_alarm_code_daily   from public, anon;
revoke all on public.dashboard_alarm_repair_daily from public, anon;
grant select on public.dashboard_alarm_code_daily   to authenticated;
grant select on public.dashboard_alarm_repair_daily to authenticated;
