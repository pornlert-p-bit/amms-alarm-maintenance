-- =====================================================================
-- Migration 006 — view สรุปข้อมูลสำหรับหน้าภาพรวม (Dashboard) (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- เหตุผล: supabase-js สั่ง group by ตรง ๆ ไม่ได้ ถ้าไม่มี view ต้องดึง Alarm ทุกแถวมานับในโค้ด
--         ซึ่งผิดหลัก QAS-01 / FM-05 (ให้ฐานข้อมูลนับ) — view จึงนับให้แล้วส่งมาแค่ผลรวม
--
-- ย้อนหลัง 31 วัน (เผื่อขอบวัน) ส่วนหน้าเว็บเลือกเองว่าจะใช้ 7 หรือ 30 วัน
-- วันที่ตัดตามเวลาไทย (Asia/Bangkok) ไม่ใช่ UTC — ไม่งั้น Alarm ตอนตี 1–7 โมงเช้าจะถูกนับเป็นวันก่อนหน้า
--
-- security_invoker = true: view ทำงานด้วยสิทธิ์ของ "ผู้เรียก" → RLS ของ alarms ยังมีผลเหมือนอ่านตารางเอง
-- (ต่างจาก staff_directory ใน migration 002 ที่ตั้งใจข้าม RLS)
-- =====================================================================

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
